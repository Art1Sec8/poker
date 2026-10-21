'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** Net chip change for the human in the most recently completed hand. */
  handResult: number | null;
  /** True when the game is over (human busted or only one player has chips). */
  isGameOver: boolean;
}

const TIMER_SECONDS = 30;

export function useGameState(): UseGameStateReturn {
  const [state, setState] = useState<GameState | null>(null);
  const [handHistory, setHandHistory] = useState<GameState[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(TIMER_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [handResult, setHandResult] = useState<number | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
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
  // Mirror of the countdown so the interval can decide when to auto-act without
  // running logic inside a setState updater (which would nest state updates).
  const secondsRef = useRef(TIMER_SECONDS);
  // Mirror of the latest state for use inside async callbacks (timer) and
  // stable callbacks, avoiding stale closures.
  const stateRef = useRef<GameState | null>(null);
  // Human chip count snapshot taken at the start of the current hand. Used to
  // compute the per-hand result regardless of where the hand completes.
  const handStartChipsRef = useRef(0);
  // Per-hand flags so VPIP/PFR are counted at most once per hand.
  const vpipThisHandRef = useRef(false);
  const pfrThisHandRef = useRef(false);
  // Always points at the latest performAction so the timer can route an
  // auto-action through the exact same pipeline as a manual one.
  const performActionRef = useRef<(type: ActionType, amount?: number) => void>(() => {});

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    secondsRef.current = TIMER_SECONDS;
    setIsTimerRunning(false);
    setTimerSeconds(TIMER_SECONDS);
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    secondsRef.current = TIMER_SECONDS;
    setTimerSeconds(TIMER_SECONDS);
    setIsTimerRunning(true);
    timerRef.current = setInterval(() => {
      const next = secondsRef.current - 1;
      secondsRef.current = next > 0 ? next : 0;
      setTimerSeconds(secondsRef.current);
      if (next > 0) return;

      // Countdown reached zero. Stop the timer, then auto-act OUTSIDE of any
      // setState updater so the action's own state updates (advance turn, run
      // AI, finish/record the hand, restart timer) don't nest. Fold if facing a
      // bet, otherwise check.
      clearTimer();
      const current = stateRef.current;
      if (current && !current.isHandComplete) {
        const player = current.players[current.currentPlayerIndex];
        if (player?.isHuman) {
          const acts = getValidActions(current);
          if (acts.some(a => a.type === 'fold')) {
            performActionRef.current('fold');
          } else if (acts.some(a => a.type === 'check')) {
            performActionRef.current('check');
          }
        }
      }
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

  // Record a completed hand exactly once: push to history and compute the
  // human's net result from the chip snapshot taken at the start of the hand.
  const finishHand = useCallback((completed: GameState) => {
    setHandHistory(prev => [...prev, completed]);
    const human = completed.players.find(p => p.isHuman);
    const delta = (human?.chips ?? 0) - handStartChipsRef.current;
    setHandResult(delta);
    if (delta > 0) {
      setSessionStats(prev => ({ ...prev, handsWon: prev.handsWon + 1, consecutiveMistakes: 0 }));
    }
  }, []);

  // Shared post-action pipeline: advance the turn, run AI turns, then either
  // record the completed hand or (re)start the human timer. Used by both
  // performAction and the timeout auto-action.
  const commitState = useCallback((applied: GameState) => {
    let newState = { ...applied, currentPlayerIndex: getNextPlayerIndex(applied) };
    newState = processAITurns(newState);
    stateRef.current = newState;
    setState(newState);

    if (newState.isHandComplete) {
      finishHand(newState);
    } else {
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      if (currentPlayer.isHuman) startTimer();
    }
  }, [processAITurns, startTimer, finishHand]);

  const startGame = useCallback((config: GameConfig) => {
    configRef.current = config;
    aiPlayersRef.current.clear();
    dealerIndexRef.current = 0;
    handNumberRef.current = 0;
    stateRef.current = null;
    setState(null);
    setHandResult(null);
    setIsGameOver(false);

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
    setHandResult(null);

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
    if (stateRef.current) {
      const prevState = stateRef.current;
      players.forEach(p => {
        const prev = prevState.players.find(sp => sp.id === p.id);
        if (prev) p.chips = prev.chips;
      });
    }

    // Eliminate busted players (0 chips) — they are not dealt in, do not post
    // blinds, and do not occupy a seat for position/blind math.
    const survivors = players.filter(p => p.chips > 0);
    const humanChips = players.find(p => p.isHuman)?.chips ?? 0;

    // Game over: the human busted, or only one player still has chips.
    if (humanChips === 0 || survivors.length <= 1) {
      clearTimer();
      setIsGameOver(true);
      return;
    }

    handNumberRef.current++;
    // Rotate the dealer button among the remaining (re-indexed) seats.
    dealerIndexRef.current = (dealerIndexRef.current + 1) % survivors.length;

    // Snapshot human chips before blinds so the per-hand result is accurate
    // wherever the hand completes.
    handStartChipsRef.current = humanChips;
    vpipThisHandRef.current = false;
    pfrThisHandRef.current = false;

    let newState = createNewHand(
      survivors, config.variant, config.smallBlind, config.bigBlind,
      dealerIndexRef.current, handNumberRef.current,
    );

    // Process AI turns until it's human's turn
    newState = processAITurns(newState);
    stateRef.current = newState;
    setState(newState);

    setSessionStats(prev => ({ ...prev, handsPlayed: prev.handsPlayed + 1 }));

    // A hand can complete before the human ever acts (e.g. opponent folds
    // preflop) — record it here so history/result/handsWon stay in sync.
    if (newState.isHandComplete) {
      finishHand(newState);
    } else {
      const currentPlayer = newState.players[newState.currentPlayerIndex];
      if (currentPlayer.isHuman) startTimer();
    }
  }, [processAITurns, startTimer, clearTimer, finishHand]);

  const performAction = useCallback((type: ActionType, amount: number = 0) => {
    const current = stateRef.current;
    if (!current || current.isHandComplete) return;
    const player = current.players[current.currentPlayerIndex];
    if (!player.isHuman) return;

    clearTimer();

    const action: ActionRecord = {
      playerId: player.id, type, amount, street: current.street, timestamp: Date.now(),
    };

    try {
      const applied = applyAction(current, action);

      // Update stats. VPIP/PFR are counted at most once per hand.
      setSessionStats(prev => {
        const updated = { ...prev };
        if (type === 'bet' || type === 'raise') { updated.totalBets++; updated.totalRaises++; }
        if (type === 'call') updated.totalCalls++;
        if (type === 'fold') updated.totalFolds++;
        if (current.street === 'preflop'
          && !vpipThisHandRef.current
          && (type === 'call' || type === 'bet' || type === 'raise' || type === 'allin')) {
          updated.vpip++;
          vpipThisHandRef.current = true;
        }
        if (current.street === 'preflop'
          && !pfrThisHandRef.current
          && (type === 'raise' || type === 'bet')) {
          updated.pfr++;
          pfrThisHandRef.current = true;
        }
        updated.aggressionFactor = updated.totalCalls > 0
          ? (updated.totalBets + updated.totalRaises) / updated.totalCalls
          : updated.totalBets + updated.totalRaises;
        return updated;
      });

      // Advance the turn, run AI, and complete/record the hand via the shared
      // pipeline (also used by the timeout auto-action).
      commitState(applied);
    } catch (e) {
      console.error('Action failed:', e);
    }
  }, [clearTimer, commitState]);

  // Keep the ref pointing at the latest performAction for the timer to use.
  useEffect(() => {
    performActionRef.current = performAction;
  }, [performAction]);

  const isPlayerTurn = state !== null && !state.isHandComplete &&
    state.players[state.currentPlayerIndex]?.isHuman === true;

  const validActions = state && isPlayerTurn ? getValidActions(state) : [];

  return {
    state, isPlayerTurn, validActions, performAction,
    startNewHand, startGame, handHistory, sessionStats,
    timerSeconds, isTimerRunning, handResult, isGameOver,
  };
}
