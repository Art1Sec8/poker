'use client';

import { useCallback, useRef, useState } from 'react';
import { ActionType, CoachAnalysis, GameState } from '@/engine/types';
import { getAmountToCall } from '@/engine/betting';

export interface UseCoachReturn {
  coachEnabled: boolean;
  toggleCoach: () => void;
  analysis: (CoachAnalysis & { equity: number }) | null;
  isLoading: boolean;
  handReview: (CoachAnalysis & { equity: number; playerAction: string })[];
  getAdvice: (state: GameState) => void;
  reviewAction: (state: GameState, actionType: ActionType, amount: number) => void;
  clearReview: () => void;
}

export function useCoach(): UseCoachReturn {
  const [coachEnabled, setCoachEnabled] = useState(false);
  const [analysis, setAnalysis] = useState<(CoachAnalysis & { equity: number }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [handReview, setHandReview] = useState<(CoachAnalysis & { equity: number; playerAction: string })[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const toggleCoach = useCallback(() => {
    setCoachEnabled(prev => !prev);
    setAnalysis(null);
  }, []);

  const clearReview = useCallback(() => {
    setHandReview([]);
    setAnalysis(null);
  }, []);

  const callCoachAPI = useCallback(async (
    state: GameState,
    playerAction?: { type: ActionType; amount: number },
  ) => {
    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const humanPlayer = state.players[state.currentPlayerIndex];
    if (!humanPlayer) return null;

    const toCall = getAmountToCall(state);

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          holeCards: humanPlayer.holeCards,
          board: state.board,
          position: humanPlayer.position,
          pot: state.pot,
          street: state.street,
          actionHistory: state.actionHistory.slice(-10),
          playerChips: humanPlayer.chips,
          opponentCount: state.players.filter(p => p.isActive && p.id !== humanPlayer.id).length,
          variant: state.variant,
          currentBet: humanPlayer.currentBet,
          toCall,
          playerAction,
        }),
      });

      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      if ((e as Error).name === 'AbortError') return null;
      console.error('Coach API error:', e);
      return null;
    }
  }, []);

  const getAdvice = useCallback(async (state: GameState) => {
    if (!coachEnabled) return;
    setIsLoading(true);
    setAnalysis(null);

    const result = await callCoachAPI(state);
    if (result) setAnalysis(result);
    setIsLoading(false);
  }, [coachEnabled, callCoachAPI]);

  const reviewAction = useCallback(async (
    state: GameState,
    actionType: ActionType,
    amount: number,
  ) => {
    if (!coachEnabled) return;

    const result = await callCoachAPI(state, { type: actionType, amount });
    if (result) {
      setHandReview(prev => [...prev, {
        ...result,
        playerAction: `${actionType}${amount > 0 ? ` $${amount}` : ''}`,
      }]);
    }
  }, [coachEnabled, callCoachAPI]);

  return {
    coachEnabled,
    toggleCoach,
    analysis,
    isLoading,
    handReview,
    getAdvice,
    reviewAction,
    clearReview,
  };
}
