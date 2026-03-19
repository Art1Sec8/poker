'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ActionType, GameState, GameVariant } from '@/engine/types';
import { getValidActions } from '@/engine/betting';

interface RoomConfig {
  variant: GameVariant;
  smallBlind: number;
  bigBlind: number;
  buyIn: number;
  maxPlayers: number;
  aiCount: number;
  aiDifficulty: 'fish' | 'regular' | 'shark' | 'random';
}

interface RoomPlayerInfo {
  name: string;
  seatIndex: number;
  isReady: boolean;
  isHost: boolean;
}

interface RoomState {
  id: string;
  config: RoomConfig;
  players: RoomPlayerInfo[];
  aiCount: number;
  isPlaying: boolean;
  handNumber: number;
}

interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
}

interface TurnTimer {
  playerId: number;
  seconds: number;
}

export interface UseMultiplayerReturn {
  isConnected: boolean;
  roomState: RoomState | null;
  gameState: GameState | null;
  chatMessages: ChatMessage[];
  mySeatIndex: number | null;
  isPlayerTurn: boolean;
  validActions: ReturnType<typeof getValidActions>;
  turnTimer: TurnTimer | null;
  error: string | null;
  createRoom: (config: RoomConfig, name: string) => void;
  joinRoom: (code: string, name: string) => void;
  leaveRoom: () => void;
  toggleReady: () => void;
  startGame: () => void;
  startHand: () => void;
  sendAction: (type: ActionType, amount?: number) => void;
  sendChat: (text: string) => void;
  clearError: () => void;
}

export function useMultiplayer(): UseMultiplayerReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null);
  const [turnTimer, setTurnTimer] = useState<TurnTimer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getSocket = useCallback(() => {
    if (!socketRef.current) {
      const socket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });

      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));
      socket.on('error', (msg: string) => setError(msg));

      socket.on('room-created', ({ code }: { code: string }) => {
        setMySeatIndex(0);
      });

      socket.on('room-joined', ({ code, seatIndex }: { code: string; seatIndex: number }) => {
        setMySeatIndex(seatIndex);
      });

      socket.on('room-state', (state: RoomState) => {
        setRoomState(state);
      });

      socket.on('game-state', (state: GameState) => {
        setGameState(state);
      });

      socket.on('chat', (msg: ChatMessage) => {
        setChatMessages(prev => [...prev.slice(-99), msg]);
      });

      socket.on('turn-timer', (timer: TurnTimer) => {
        setTurnTimer(timer);
      });

      socketRef.current = socket;
    }
    return socketRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const createRoom = useCallback((config: RoomConfig, name: string) => {
    const socket = getSocket();
    setChatMessages([]);
    setGameState(null);
    socket.emit('create-room', config, name);
  }, [getSocket]);

  const joinRoom = useCallback((code: string, name: string) => {
    const socket = getSocket();
    setChatMessages([]);
    setGameState(null);
    socket.emit('join-room', code.toUpperCase(), name);
  }, [getSocket]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave-room');
    setRoomState(null);
    setGameState(null);
    setChatMessages([]);
    setMySeatIndex(null);
    setTurnTimer(null);
  }, []);

  const toggleReady = useCallback(() => {
    socketRef.current?.emit('toggle-ready');
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('start-game');
  }, []);

  const startHand = useCallback(() => {
    socketRef.current?.emit('start-hand');
  }, []);

  const sendAction = useCallback((type: ActionType, amount: number = 0) => {
    socketRef.current?.emit('player-action', { type, amount });
  }, []);

  const sendChat = useCallback((text: string) => {
    socketRef.current?.emit('chat-message', text);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const isPlayerTurn = gameState !== null && !gameState.isHandComplete &&
    mySeatIndex !== null &&
    gameState.players[gameState.currentPlayerIndex]?.id === mySeatIndex;

  const validActions = gameState && isPlayerTurn ? getValidActions(gameState) : [];

  return {
    isConnected,
    roomState,
    gameState,
    chatMessages,
    mySeatIndex,
    isPlayerTurn,
    validActions,
    turnTimer,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    startHand,
    sendAction,
    sendChat,
    clearError,
  };
}
