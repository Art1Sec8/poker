import { AIPlayer } from './ai-player';
import { ActionRecord, GameState } from '../types';
import { getValidActions, getAmountToCall } from '../betting';
import { evaluateHand } from '../hand-evaluator';
import { evaluatePloHand } from '../plo-evaluator';
import { evaluatePreflopStrength } from '../preflop';

/**
 * Regular AI: Tight-aggressive (TAG) player.
 * - Plays strong hands aggressively
 * - Folds weak hands to bets
 * - Some positional awareness
 */
export class RegularAI implements AIPlayer {
  difficulty = 'regular' as const;

  decide(state: GameState, playerIndex: number): ActionRecord {
    const tempState = { ...state, currentPlayerIndex: playerIndex };
    const actions = getValidActions(tempState);
    if (actions.length === 0) {
      return this.makeAction(playerIndex, 'check', 0, state.street);
    }

    const player = state.players[playerIndex];
    const toCall = getAmountToCall(tempState);
    const handStrength = this.getHandStrength(state, playerIndex);
    const posBonus = POSITION_BONUS[player.position] ?? 0;
    const adjustedStrength = Math.min(1, handStrength + posBonus);

    if (toCall > 0) {
      const potOdds = toCall / (state.pot + toCall);

      if (adjustedStrength > 0.8) {
        const raiseAction = actions.find(a => a.type === 'raise');
        if (raiseAction) {
          const sizeFactor = 0.6 + Math.random() * 0.4;
          const amount = Math.floor(raiseAction.minAmount + (raiseAction.maxAmount - raiseAction.minAmount) * sizeFactor);
          return this.makeAction(playerIndex, 'raise', Math.min(amount, player.chips), state.street);
        }
      }

      if (adjustedStrength > potOdds + 0.05) {
        const callAction = actions.find(a => a.type === 'call' || a.type === 'allin');
        if (callAction) return this.makeAction(playerIndex, callAction.type, callAction.minAmount, state.street);
      }

      return this.makeAction(playerIndex, 'fold', 0, state.street);
    }

    // No bet to face
    if (adjustedStrength > 0.65) {
      const betAction = actions.find(a => a.type === 'bet');
      if (betAction) {
        const potFraction = 0.5 + Math.random() * 0.3;
        const amount = Math.max(betAction.minAmount, Math.floor(state.pot * potFraction));
        return this.makeAction(playerIndex, 'bet', Math.min(amount, betAction.maxAmount, player.chips), state.street);
      }
    }

    return this.makeAction(playerIndex, 'check', 0, state.street);
  }

  private getHandStrength(state: GameState, playerIndex: number): number {
    const player = state.players[playerIndex];

    if (state.board.length === 0) {
      return evaluatePreflopStrength(player.holeCards, state.variant);
    }

    const result = state.variant === 'plo'
      ? evaluatePloHand(player.holeCards, state.board)
      : evaluateHand([...player.holeCards, ...state.board]);

    return 1 - (result.rank - 1) / 7461;
  }

  private makeAction(playerId: number, type: ActionRecord['type'], amount: number, street: GameState['street']): ActionRecord {
    return { playerId, type, amount, street, timestamp: Date.now() };
  }
}

const POSITION_BONUS: Record<string, number> = {
  'UTG': -0.05, 'UTG1': -0.03, 'MP': -0.02, 'MP1': 0,
  'HJ': 0.02, 'CO': 0.05, 'BTN': 0.08, 'SB': -0.02, 'BB': 0,
};
