'use client';

import { useCallback, useRef, useState } from 'react';
import {
  ActionRecord, ActionType, GameState, GameVariant, PlayerState,
} from '@/engine/types';
import { createNewHand, advanceStreet, isStreetComplete, isHandOver, getNextPlayerIndex, resolveShowdown } from '@/engine/game-state';
import { applyAction, getValidActions } from '@/engine/betting';
import { createAIPlayer, AIPlayer } from '@/engine/ai/ai-player';

interface GameConfig {
  variant: GameVariant;
  smallBlind: number;
  bigBlind: number;
  buyIn: number;
  aiSeats: { difficulty: 'fish' | 'regular' | 'shark' | 'random' }[];
}

interface SessionStats {
  handsPlayed: number;
  handsWon: number;
  vpip: number; // voluntarily put $ in pot
  pfr: number;  // preflop raise
  aggressionFactor: number;
  consecutiveMistakes: number;
  totalBets: number;
  totalRaises: number;
  totalCalls: number;
  totalFolds: number;
}

export interface UseGameStateReturn {
  state: GameState | null;
  isPlayerTurn: boolean;
  validActions: ReturnType<typeof getValidActions>;
  performAction: (type: ActionType, amount?: number) => void;
  startNewHand: () => void;
  startGame: (config: GameConfig) => void;
  handHistory: GameState[];
  sessionStats: SessionStats;
  timerSeconds: number;
  isTimerRunning: boolean;
}

const TIMER_SECONDS = 30;

export function useGameState(): UseGameStateReturn {
  const [state, setState] = useState<GameState | null>(null);
  const [handHistory, setHandHistory] = useState<GameState[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(TIMER_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    handsPlayed: 0, handsWon: 0, vpip: 0, pfr: 0,
    aggressionFactor: 0, consecutiveMistakes: 0,
    totalBets: 0, totalRaises: 0, totalCalls: 0, totalFolds: 0,
  });

  const configRef = useRef<GameConfig | null>(null);
  const aiPlayersRef = useRef<Map<number, AIPlayer>>(new Map());
  const dealerIndexRef = useRef(0);
  const handNumberRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsTimerRunning(false);
    setTimerSeconds(TIMER_SECONDS);
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setTimerSeconds(TIMER_SECONDS);
    setIsTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearTimer();
          // Auto-fold on timeout
          setState(currentState => {
            if (!currentState || currentState.isHandComplete) return currentState;
            const player = currentState.players[currentState.currentPlayerIndex];
            if (!player.isHuman) return currentState;
            const action: ActionRecord = {
              playerId: player.id, type: 'fold', amount: 0,
              street: currentState.street, timestamp: Date.now(),
            };
            try {
              return applyAction(currentState, action);
            } catch {
              // If fold is invalid (e.g., no bet to face), check instead
              const checkAction: ActionRecord = { ...action, type: 'check' };
              try { return applyAction(currentState, checkAction); } catch { return currentState; }
            }
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const processAITurns = useCallback((gameState: GameState): GameState => {
    let current = gameState;
    let safetyCounter = 0;

    while (!current.isHandComplete && safetyCounter < 50) {
      safetyCounter++;

      // Check if hand is over
      if (isHandOver(current)) {
        current = resolveShowdown(current);
        break;
      }

      // Check if street is complete
      if (isStreetComplete(current)) {
        current = advanceStreet(current);
        if (current.isHandComplete) break;
        continue;
      }

      const currentPlayer = current.players[current.currentPlayerIndex];

      // If it's a human's turn, stop processing
      if (currentPlayer.isHuman) break;

      // AI turn
      const ai = aiPlayersRef.current.get(currentPlayer.id);
      if (!ai) break;

      const action = ai.decide(current, current.currentPlayerIndex);
      try {
        current = applyAction(current, action);
      } catch {
        // If AI action fails, try folding or checking
        const fallback: ActionRecord = {
          playerId: currentPlayer.id,
          type: current.players.some(p => p.currentBet > currentPlayer.currentBet) ? 'fold' : 'check',
          amount: 0, street: current.street, timestamp: Date.now(),
        };
        try { current = applyAction(current, fallback); } catch { break; }
      }

      // Advance to next player
      current = { ...current, currentPlayerIndex: getNextPlayerIndex(current) };
    }

    return current;
  }, []);

  const startGame = useCallback((config: GameConfig) => {
    configRef.current = config;
    aiPlayersRef.current.clear();
    dealerIndexRef.current = 0;
    handNumberRef.current = 0;

    // Create AI players
    config.aiSeats.forEach((seat, i) => {
      const aiId = i + 1;
      aiPlayersRef.current.set(aiId, createAIPlayer(seat.difficulty));
    });

    setSessionStats({
      handsPlayed: 0, handsWon: 0, vpip: 0, pfr: 0,
      aggressionFactor: 0, consecutiveMistakes: 0,
      totalBets: 0, totalRaises: 0, totalCalls: 0, totalFolds: 0,
    });
    setHandHistory([]);
  }, []);

  const startNewHand = useCallback(() => {
    const config = configRef.current;
    if (!config) return;

    clearTimer();
    handNumberRef.current++;
    dealerIndexRef.current = (dealerIndexRef.current + 1) % (1 + config.aiSeats.length);

    const players: Omit<PlayerState, 'holeCards' | 'currentBet' | 'totalBetThisHand' | 'isActive' | 'position'>[] = [
      { id: 0, name: 'You', chips: config.buyIn, isHuman: true, isSittingOut: false },
      ...config.aiSeats.map((seat, i) => ({
        id: i + 1,
        name: `AI ${seat.difficulty.charAt(0).toUpperCase() + seat.difficulty.slice(1)} ${i + 1}`,
        chips: config.buyIn,
        isHuman: false,
        isSittingOut: false,
        aiDifficulty: seat.difficulty === 'random' ? undefined : seat.difficulty as 'fish' | 'regular' | 'shark',
      })),
    ];

    // Preserve chip counts from previous hand
    if (state) {
      players.forEach(p => {
        const prev = state.players.find(sp => sp.id === p.id);
        if (prev) p.chips = prev.chips;
      });
    }

    let newState = createNewHand(
      players, config.variant, config.smallBlind, config.bigBlind,
      dealerIndexRef.current, handNumberRef.current,
    );

    // Process AI turns until it's human's turn
    newState = processAITurns(newState);
    setState(newState);

    if (!newState.isHandComplete) {
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      if (currentPlayer.isHuman) startTimer();
    }

    setSessionStats(prev => ({ ...prev, handsPlayed: prev.handsPlayed + 1 }));
  }, [state, processAITurns, startTimer, clearTimer]);

  const performAction = useCallback((type: ActionType, amount: number = 0) => {
    if (!state || state.isHandComplete) return;
    const player = state.players[state.currentPlayerIndex];
    if (!player.isHuman) return;

    clearTimer();

    const action: ActionRecord = {
      playerId: player.id, type, amount, street: state.street, timestamp: Date.now(),
    };

    try {
      let newState = applyAction(state, action);

      // Update stats
      setSessionStats(prev => {
        const updated = { ...prev };
        if (type === 'bet' || type === 'raise') { updated.totalBets++; updated.totalRaises++; }
        if (type === 'call') updated.totalCalls++;
        if (type === 'fold') updated.totalFolds++;
        if (state.street === 'preflop' && (type === 'call' || type === 'bet' || type === 'raise' || type === 'allin')) {
          updated.vpip++;
        }
        if (state.street === 'preflop' && (type === 'raise' || type === 'bet')) {
          updated.pfr++;
        }
        updated.aggressionFactor = updated.totalCalls > 0
          ? (updated.totalBets + updated.totalRaises) / updated.totalCalls
          : updated.totalBets + updated.totalRaises;
        return updated;
      });

      // Advance to next player
      newState = { ...newState, currentPlayerIndex: getNextPlayerIndex(newState) };

      // Process AI turns
      newState = processAITurns(newState);

      setState(newState);

      // If hand complete, save to history
      if (newState.isHandComplete) {
        setHandHistory(prev => [...prev, newState]);
        const humanPlayer = newState.players.find(p => p.isHuman);
        if (humanPlayer && humanPlayer.chips > (state.players.find(p => p.isHuman)?.chips ?? 0)) {
          setSessionStats(prev => ({ ...prev, handsWon: prev.handsWon + 1, consecutiveMistakes: 0 }));
        }
      } else {
        const currentPlayer = newState.players[newState.currentPlayerIndex];
        if (currentPlayer.isHuman) startTimer();
      }
    } catch (e) {
      console.error('Action failed:', e);
    }
  }, [state, processAITurns, startTimer, clearTimer]);

  const isPlayerTurn = state !== null && !state.isHandComplete &&
    state.players[state.currentPlayerIndex]?.isHuman === true;

  const validActions = state && isPlayerTurn ? getValidActions(state) : [];

  return {
    state, isPlayerTurn, validActions, performAction,
    startNewHand, startGame, handHistory, sessionStats,
    timerSeconds, isTimerRunning,
  };
}
