import { AIPlayer } from './ai-player';
import { ActionRecord, GameState } from '../types';
import { getValidActions, getAmountToCall } from '../betting';
import { evaluateHand } from '../hand-evaluator';
import { evaluatePloHand } from '../plo-evaluator';
import { calculateEquity } from '../equity-calculator';

/**
 * Shark AI: GTO-adjacent player.
 * - Uses equity estimation for decisions
 * - Bluffs at appropriate frequencies
 * - Strong positional play
 * - Mixes bet sizes
 */
export class SharkAI implements AIPlayer {
  difficulty = 'shark' as const;

  decide(state: GameState, playerIndex: number): ActionRecord {
    const tempState = { ...state, currentPlayerIndex: playerIndex };
    const actions = getValidActions(tempState);
    const player = state.players[playerIndex];
    const toCall = getAmountToCall(tempState);
    const activePlayers = state.players.filter(p => p.isActive && p.id !== player.id);

    // Quick equity estimate against random hand
    const equity = this.estimateEquity(state, playerIndex);
    const posBonus = this.getPositionalBonus(player.position);
    const adjustedEquity = Math.min(1, equity + posBonus);

    // Bluff frequency based on position and board texture
    const bluffFreq = this.getBluffFrequency(state, player.position);

    if (toCall > 0) {
      const potOdds = toCall / (state.pot + toCall);
      const impliedOdds = potOdds * 0.85; // slight discount for implied odds

      if (adjustedEquity > 0.7) {
        // Strong hand — raise for value with mixed sizing
        const raiseAction = actions.find(a => a.type === 'raise');
        if (raiseAction) {
          const size = this.chooseRaiseSize(state, adjustedEquity, raiseAction.minAmount, raiseAction.maxAmount);
          return this.makeAction(playerIndex, 'raise', Math.min(size, player.chips), state.street);
        }
      }

      // Semi-bluff raise
      if (adjustedEquity > 0.35 && adjustedEquity < 0.55 && Math.random() < bluffFreq) {
        const raiseAction = actions.find(a => a.type === 'raise');
        if (raiseAction) {
          const size = Math.floor(state.pot * (0.6 + Math.random() * 0.2));
          return this.makeAction(playerIndex, 'raise', Math.min(Math.max(size, raiseAction.minAmount), raiseAction.maxAmount, player.chips), state.street);
        }
      }

      if (adjustedEquity > impliedOdds) {
        return this.makeAction(playerIndex, 'call', Math.min(toCall, player.chips), state.street);
      }

      return this.makeAction(playerIndex, 'fold', 0, state.street);
    }

    // No bet to face
    if (adjustedEquity > 0.6) {
      // Value bet
      const betAction = actions.find(a => a.type === 'bet');
      if (betAction) {
        const size = this.chooseBetSize(state, adjustedEquity, betAction.minAmount, betAction.maxAmount);
        return this.makeAction(playerIndex, 'bet', Math.min(size, player.chips), state.street);
      }
    }

    // Bluff bet
    if (adjustedEquity < 0.3 && Math.random() < bluffFreq * 0.5) {
      const betAction = actions.find(a => a.type === 'bet');
      if (betAction) {
        const size = Math.floor(state.pot * (0.3 + Math.random() * 0.4)); // 30-70% pot bluff
        return this.makeAction(playerIndex, 'bet', Math.min(Math.max(size, betAction.minAmount), betAction.maxAmount, player.chips), state.street);
      }
    }

    return this.makeAction(playerIndex, 'check', 0, state.street);
  }

  private estimateEquity(state: GameState, playerIndex: number): number {
    const player = state.players[playerIndex];

    if (state.board.length === 0) {
      return this.getPreflopEquity(player.holeCards, state.variant);
    }

    // Use hand rank as proxy for equity (fast)
    const result = state.variant === 'plo'
      ? evaluatePloHand(player.holeCards, state.board)
      : evaluateHand([...player.holeCards, ...state.board]);

    // Convert to equity estimate (rank 1 = ~1.0, rank 7462 = ~0.0)
    const rawEquity = 1 - (result.rank - 1) / 7461;

    // Adjust for number of opponents
    const numOpponents = state.players.filter(p => p.isActive && p.id !== player.id).length;
    const adjustedEquity = Math.pow(rawEquity, 1 + numOpponents * 0.15);

    return adjustedEquity;
  }

  private getPreflopEquity(cards: number[], variant: string): number {
    if (variant === 'plo') return 0.25 + Math.random() * 0.3;

    const { cardRank, cardSuit } = require('../card');
    const r1 = cardRank(cards[0]);
    const r2 = cardRank(cards[1]);
    const suited = cardSuit(cards[0]) === cardSuit(cards[1]);
    const high = Math.max(r1, r2);
    const low = Math.min(r1, r2);
    const isPair = r1 === r2;
    const gap = high - low;

    let equity = 0;
    if (isPair) {
      equity = 0.55 + (high / 12) * 0.35;
    } else {
      equity = (high / 12) * 0.35 + (low / 12) * 0.15;
      if (suited) equity += 0.04;
      if (gap <= 1) equity += 0.04;
      else if (gap <= 3) equity += 0.02;
    }

    return Math.min(0.95, equity);
  }

  private getPositionalBonus(position: string): number {
    const bonuses: Record<string, number> = {
      'UTG': -0.04, 'UTG1': -0.03, 'MP': -0.01, 'MP1': 0,
      'HJ': 0.02, 'CO': 0.04, 'BTN': 0.06, 'SB': -0.02, 'BB': 0,
    };
    return bonuses[position] || 0;
  }

  private getBluffFrequency(state: GameState, position: string): number {
    const baseFreq = 0.25;
    const posBonus: Record<string, number> = {
      'BTN': 0.15, 'CO': 0.10, 'SB': 0.05,
    };
    return baseFreq + (posBonus[position] || 0);
  }

  private chooseRaiseSize(state: GameState, equity: number, min: number, max: number): number {
    // Polarized sizing: big with very strong or bluffs, medium with medium strength
    if (equity > 0.85) {
      return Math.floor(state.pot * (0.75 + Math.random() * 0.5)); // 75-125% pot
    }
    return Math.floor(state.pot * (0.5 + Math.random() * 0.25)); // 50-75% pot
  }

  private chooseBetSize(state: GameState, equity: number, min: number, max: number): number {
    const roll = Math.random();
    if (roll < 0.3) {
      return Math.max(min, Math.floor(state.pot * 0.33)); // 1/3 pot
    } else if (roll < 0.7) {
      return Math.max(min, Math.floor(state.pot * 0.66)); // 2/3 pot
    }
    return Math.max(min, Math.floor(state.pot * 1.0)); // Full pot
  }

  private makeAction(playerId: number, type: ActionRecord['type'], amount: number, street: GameState['street']): ActionRecord {
    return { playerId, type, amount, street, timestamp: Date.now() };
  }
}
