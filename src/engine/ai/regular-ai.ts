import { AIPlayer } from './ai-player';
import { ActionRecord, GameState } from '../types';
import { getValidActions, getAmountToCall } from '../betting';
import { evaluateHand } from '../hand-evaluator';
import { evaluatePloHand } from '../plo-evaluator';

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
    const player = state.players[playerIndex];
    const toCall = getAmountToCall(tempState);

    // Evaluate hand strength (0-1 scale, 1 = best)
    const handStrength = this.getHandStrength(state, playerIndex);

    // Positional bonus (later position = more aggressive)
    const posBonus = this.getPositionalBonus(player.position);
    const adjustedStrength = Math.min(1, handStrength + posBonus);

    if (toCall > 0) {
      const potOdds = toCall / (state.pot + toCall);

      if (adjustedStrength > 0.8) {
        // Strong hand — raise
        const raiseAction = actions.find(a => a.type === 'raise');
        if (raiseAction) {
          const sizeFactor = 0.6 + Math.random() * 0.4; // 60-100% of range
          const amount = Math.floor(raiseAction.minAmount + (raiseAction.maxAmount - raiseAction.minAmount) * sizeFactor);
          return this.makeAction(playerIndex, 'raise', Math.min(amount, player.chips), state.street);
        }
      }

      if (adjustedStrength > potOdds + 0.05) {
        // Good enough odds — call
        return this.makeAction(playerIndex, 'call', Math.min(toCall, player.chips), state.street);
      }

      // Fold
      return this.makeAction(playerIndex, 'fold', 0, state.street);
    }

    // No bet to face
    if (adjustedStrength > 0.65) {
      // Bet for value
      const betAction = actions.find(a => a.type === 'bet');
      if (betAction) {
        const potFraction = 0.5 + Math.random() * 0.3; // 50-80% pot
        const amount = Math.max(betAction.minAmount, Math.floor(state.pot * potFraction));
        return this.makeAction(playerIndex, 'bet', Math.min(amount, betAction.maxAmount, player.chips), state.street);
      }
    }

    return this.makeAction(playerIndex, 'check', 0, state.street);
  }

  private getHandStrength(state: GameState, playerIndex: number): number {
    const player = state.players[playerIndex];

    if (state.board.length === 0) {
      // Preflop: simple hand strength estimate
      return this.getPreflopStrength(player.holeCards, state.variant);
    }

    // Post-flop: evaluate hand rank
    const result = state.variant === 'plo'
      ? evaluatePloHand(player.holeCards, state.board)
      : evaluateHand([...player.holeCards, ...state.board]);

    // Convert rank (1-7462) to 0-1 scale
    return 1 - (result.rank - 1) / 7461;
  }

  private getPreflopStrength(cards: number[], variant: string): number {
    if (variant === 'plo') {
      // Simplified PLO preflop strength
      return 0.3 + Math.random() * 0.4; // TODO: proper PLO preflop evaluation
    }

    const { cardRank } = require('../card');
    const r1 = cardRank(cards[0]);
    const r2 = cardRank(cards[1]);
    const { cardSuit } = require('../card');
    const suited = cardSuit(cards[0]) === cardSuit(cards[1]);
    const high = Math.max(r1, r2);
    const low = Math.min(r1, r2);
    const gap = high - low;
    const isPair = r1 === r2;

    let strength = 0;
    if (isPair) {
      strength = 0.5 + (high / 12) * 0.5;
    } else {
      strength = (high / 12) * 0.3 + (low / 12) * 0.15;
      if (suited) strength += 0.06;
      if (gap <= 1) strength += 0.05;
      if (gap <= 2) strength += 0.03;
    }

    return Math.min(1, strength);
  }

  private getPositionalBonus(position: string): number {
    const bonuses: Record<string, number> = {
      'UTG': -0.05, 'UTG1': -0.03, 'MP': -0.02, 'MP1': 0,
      'HJ': 0.02, 'CO': 0.05, 'BTN': 0.08, 'SB': -0.02, 'BB': 0,
    };
    return bonuses[position] || 0;
  }

  private makeAction(playerId: number, type: ActionRecord['type'], amount: number, street: GameState['street']): ActionRecord {
    return { playerId, type, amount, street, timestamp: Date.now() };
  }
}
