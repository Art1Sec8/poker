import { Server } from 'socket.io';
import {
  ActionRecord, ActionType, GameState, GameVariant, PlayerState,
} from '../engine/types';
import { createNewHand, advanceStreet, isStreetComplete, isHandOver, resolveShowdown, getNextPlayerIndex } from '../engine/game-state';
import { applyAction, getValidActions } from '../engine/betting';
import { createAIPlayer, AIPlayer } from '../engine/ai/ai-player';
import { sanitizeForPlayer } from '../engine/state-sanitizer';

export interface RoomPlayer {
  socketId: string;
  name: string;
  seatIndex: number;
  isReady: boolean;
}

export interface RoomConfig {
  variant: GameVariant;
  smallBlind: number;
  bigBlind: number;
  buyIn: number;
  maxPlayers: number;
  aiCount: number;
  aiDifficulty: 'fish' | 'regular' | 'shark' | 'random';
}

interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
}

const TURN_TIMER_SECONDS = 30;

export class ServerGameRoom {
  id: string;
  config: RoomConfig;
  players: Map<string, RoomPlayer> = new Map();
  gameState: GameState | null = null;
  aiPlayers: Map<number, AIPlayer> = new Map();
  hostSocketId: string;
  chat: ChatMessage[] = [];
  dealerIndex = 0;
  handNumber = 0;
  chipCounts: Map<number, number> = new Map(); // seatIndex -> chips (persisted between hands)
  private turnTimer: NodeJS.Timeout | null = null;
  private io: Server;

  constructor(id: string, config: RoomConfig, hostSocketId: string, io: Server) {
    this.id = id;
    this.config = config;
    this.hostSocketId = hostSocketId;
    this.io = io;
  }

  get playerCount(): number {
    return this.players.size;
  }

  get allReady(): boolean {
    if (this.players.size < 1) return false;
    for (const p of this.players.values()) {
      if (!p.isReady) return false;
    }
    return true;
  }

  join(socketId: string, name: string): { seatIndex: number } | { error: string } {
    if (this.players.size >= this.config.maxPlayers) {
      return { error: 'Room is full' };
    }
    if (this.players.has(socketId)) {
      return { error: 'Already in room' };
    }

    // Find next available seat
    const taken = new Set([...this.players.values()].map(p => p.seatIndex));
    let seat = 0;
    while (taken.has(seat)) seat++;

    const player: RoomPlayer = { socketId, name, seatIndex: seat, isReady: false };
    this.players.set(socketId, player);

    return { seatIndex: seat };
  }

  leave(socketId: string): void {
    const player = this.players.get(socketId);
    if (!player) return;

    // If game is active, auto-fold this player
    if (this.gameState && !this.gameState.isHandComplete) {
      const gamePlayer = this.gameState.players.find(p => p.id === player.seatIndex);
      if (gamePlayer && gamePlayer.isActive) {
        gamePlayer.isActive = false; // mark as folded
        // Check if hand should end
        if (isHandOver(this.gameState)) {
          this.gameState = resolveShowdown(this.gameState);
          this.saveChipCounts();
          this.broadcastGameState();
        }
      }
    }

    this.players.delete(socketId);

    // Transfer host if host left
    if (socketId === this.hostSocketId && this.players.size > 0) {
      this.hostSocketId = this.players.values().next().value!.socketId;
    }
  }

  toggleReady(socketId: string): boolean {
    const player = this.players.get(socketId);
    if (!player) return false;
    player.isReady = !player.isReady;
    return player.isReady;
  }

  startHand(): { error?: string } {
    const totalPlayers = this.players.size + this.config.aiCount;
    if (totalPlayers < 2) return { error: 'Need at least 2 players' };

    this.clearTurnTimer();
    this.handNumber++;
    this.dealerIndex = (this.dealerIndex + 1) % totalPlayers;

    // Create AI players
    this.aiPlayers.clear();
    const humanSeats = [...this.players.values()].map(p => p.seatIndex);
    let aiSeatIndex = this.config.maxPlayers; // AI seats start after max human seats
    for (let i = 0; i < this.config.aiCount; i++) {
      while (humanSeats.includes(aiSeatIndex)) aiSeatIndex++;
      this.aiPlayers.set(aiSeatIndex, createAIPlayer(this.config.aiDifficulty));
      aiSeatIndex++;
    }

    // Build player list
    const allPlayers: Omit<PlayerState, 'holeCards' | 'currentBet' | 'totalBetThisHand' | 'isActive' | 'position'>[] = [];

    for (const rp of this.players.values()) {
      allPlayers.push({
        id: rp.seatIndex,
        name: rp.name,
        chips: this.chipCounts.get(rp.seatIndex) ?? this.config.buyIn,
        isHuman: true,
        isSittingOut: false,
      });
    }

    for (const [seatIdx] of this.aiPlayers) {
      const diff = this.config.aiDifficulty;
      allPlayers.push({
        id: seatIdx,
        name: `AI ${diff.charAt(0).toUpperCase() + diff.slice(1)}`,
        chips: this.chipCounts.get(seatIdx) ?? this.config.buyIn,
        isHuman: false,
        isSittingOut: false,
      });
    }

    // Sort by seat index for consistent ordering
    allPlayers.sort((a, b) => a.id - b.id);

    // Filter out busted players
    const activePlayers = allPlayers.filter(p => p.chips > 0);
    if (activePlayers.length < 2) return { error: 'Not enough players with chips' };

    let newState = createNewHand(
      activePlayers, this.config.variant,
      this.config.smallBlind, this.config.bigBlind,
      this.dealerIndex % activePlayers.length, this.handNumber,
    );

    // Process AI preflop turns
    newState = this.processAITurns(newState);
    this.gameState = newState;

    this.broadcastGameState();
    this.startTurnTimerIfHuman();

    return {};
  }

  handleAction(socketId: string, actionType: ActionType, amount: number = 0): { error?: string } {
    if (!this.gameState || this.gameState.isHandComplete) {
      return { error: 'No active hand' };
    }

    const player = this.players.get(socketId);
    if (!player) return { error: 'Not in room' };

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (currentPlayer.id !== player.seatIndex) {
      return { error: 'Not your turn' };
    }

    this.clearTurnTimer();

    const action: ActionRecord = {
      playerId: currentPlayer.id,
      type: actionType,
      amount,
      street: this.gameState.street,
      timestamp: Date.now(),
    };

    try {
      let newState = applyAction(this.gameState, action);
      newState = { ...newState, currentPlayerIndex: getNextPlayerIndex(newState) };
      newState = this.processAITurns(newState);
      this.gameState = newState;

      if (newState.isHandComplete) {
        this.saveChipCounts();
      }

      this.broadcastGameState();
      this.startTurnTimerIfHuman();

      return {};
    } catch (e) {
      return { error: `Invalid action: ${(e as Error).message}` };
    }
  }

  addChat(sender: string, text: string): void {
    const msg: ChatMessage = { sender, text: text.slice(0, 200), timestamp: Date.now() };
    this.chat.push(msg);
    if (this.chat.length > 100) this.chat.shift();
    this.io.to(this.id).emit('chat', msg);
  }

  private processAITurns(gameState: GameState): GameState {
    let current = gameState;
    let safety = 0;

    while (!current.isHandComplete && safety < 50) {
      safety++;

      if (isHandOver(current)) {
        current = resolveShowdown(current);
        break;
      }

      if (isStreetComplete(current)) {
        current = advanceStreet(current);
        if (current.isHandComplete) break;
        continue;
      }

      const currentPlayer = current.players[current.currentPlayerIndex];
      if (currentPlayer.isHuman) break;

      const ai = this.aiPlayers.get(currentPlayer.id);
      if (!ai) break;

      const action = ai.decide(current, current.currentPlayerIndex);
      try {
        current = applyAction(current, action);
      } catch {
        const fallback: ActionRecord = {
          playerId: currentPlayer.id,
          type: current.players.some(p => p.currentBet > currentPlayer.currentBet) ? 'fold' : 'check',
          amount: 0, street: current.street, timestamp: Date.now(),
        };
        try { current = applyAction(current, fallback); } catch { break; }
      }

      current = { ...current, currentPlayerIndex: getNextPlayerIndex(current) };
    }

    return current;
  }

  private broadcastGameState(): void {
    if (!this.gameState) return;

    for (const rp of this.players.values()) {
      const sanitized = sanitizeForPlayer(this.gameState, rp.seatIndex);
      this.io.to(rp.socketId).emit('game-state', sanitized);
    }
  }

  private startTurnTimerIfHuman(): void {
    if (!this.gameState || this.gameState.isHandComplete) return;

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!currentPlayer.isHuman) return;

    // Find socket for this player
    const rp = [...this.players.values()].find(p => p.seatIndex === currentPlayer.id);
    if (!rp) return;

    let seconds = TURN_TIMER_SECONDS;
    this.io.to(this.id).emit('turn-timer', { playerId: currentPlayer.id, seconds });

    this.turnTimer = setInterval(() => {
      seconds--;
      this.io.to(this.id).emit('turn-timer', { playerId: currentPlayer.id, seconds });

      if (seconds <= 0) {
        this.clearTurnTimer();
        // Auto-fold or check
        const validActions = getValidActions(this.gameState!);
        const canCheck = validActions.some(a => a.type === 'check');
        this.handleAction(rp.socketId, canCheck ? 'check' : 'fold', 0);
      }
    }, 1000);
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  private saveChipCounts(): void {
    if (!this.gameState) return;
    for (const p of this.gameState.players) {
      this.chipCounts.set(p.id, p.chips);
    }
  }

  getRoomState() {
    return {
      id: this.id,
      config: this.config,
      players: [...this.players.values()].map(p => ({
        name: p.name,
        seatIndex: p.seatIndex,
        isReady: p.isReady,
        isHost: p.socketId === this.hostSocketId,
      })),
      aiCount: this.config.aiCount,
      isPlaying: this.gameState !== null && !this.gameState.isHandComplete,
      handNumber: this.handNumber,
    };
  }

  destroy(): void {
    this.clearTurnTimer();
  }
}

export class RoomManager {
  private rooms: Map<string, ServerGameRoom> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return this.rooms.has(code) ? this.generateCode() : code;
  }

  createRoom(config: RoomConfig, hostSocketId: string): ServerGameRoom {
    const code = this.generateCode();
    const room = new ServerGameRoom(code, config, hostSocketId, this.io);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): ServerGameRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      room.destroy();
      this.rooms.delete(code);
    }
  }

  findRoomBySocket(socketId: string): ServerGameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.has(socketId)) return room;
    }
    return undefined;
  }

  cleanup(): void {
    // Remove empty rooms
    for (const [code, room] of this.rooms) {
      if (room.players.size === 0) {
        room.destroy();
        this.rooms.delete(code);
      }
    }
  }
}
