import { describe, it, expect } from 'vitest';
import { createAIPlayer } from '../ai/ai-player';
import { createNewHand } from '../game-state';
import { getValidActions } from '../betting';
import { PlayerState } from '../types';

function basePlayers(n: number): Omit<PlayerState, 'holeCards' | 'currentBet' | 'totalBetThisHand' | 'isActive' | 'position'>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i, name: `P${i}`, chips: 1000, isSittingOut: false, isHuman: i === 0,
    aiDifficulty: i > 0 ? 'regular' as const : undefined,
  }));
}

describe('AI players', () => {
  const difficulties = ['fish', 'regular', 'shark'] as const;

  for (const difficulty of difficulties) {
    describe(`${difficulty} AI`, () => {
      it('produces a valid action', () => {
        const ai = createAIPlayer(difficulty);
        const state = createNewHand(basePlayers(3), 'holdem', 5, 10, 0, 1);

        // AI is player 1 or 2
        const playerIndex = state.currentPlayerIndex;
        const action = ai.decide(state, playerIndex);

        expect(action.playerId).toBe(playerIndex);
        expect(action.street).toBe('preflop');
        expect(['fold', 'check', 'call', 'bet', 'raise', 'allin']).toContain(action.type);
      });

      it('does not crash on flop', () => {
        const ai = createAIPlayer(difficulty);
        let state = createNewHand(basePlayers(2), 'holdem', 5, 10, 0, 1);
        // Advance to flop
        state.street = 'flop';
        state.board = state.deck.splice(0, 3);
        state.players.forEach(p => { p.currentBet = 0; });

        const action = ai.decide(state, 0);
        expect(['fold', 'check', 'call', 'bet', 'raise', 'allin']).toContain(action.type);
      });
    });
  }

  it('creates random AI (one of three difficulties)', () => {
    const ai = createAIPlayer('random');
    expect(['fish', 'regular', 'shark']).toContain(ai.difficulty);
  });
});
