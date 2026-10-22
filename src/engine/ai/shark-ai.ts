import { AIPlayer } from './ai-player';
import { ActionRecord, GameState } from '../types';
import { getValidActions, getAmountToCall } from '../betting';
import { evaluateHand } from '../hand-evaluator';
import { evaluatePloHand } from '../plo-evaluator';
import { evaluatePreflopStrength } from '../preflop';
import { random } from '../rng';

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
    if (actions.length === 0) {
      return this.makeAction(playerIndex, 'check', 0, state.street);
    }

    const player = state.players[playerIndex];
    const toCall = getAmountToCall(tempState);
    const equity = this.estimateEquity(state, playerIndex);
    const posBonus = POSITION_BONUS[player.position] ?? 0;
    const adjustedEquity = Math.min(1, equity + posBonus);
    const bluffFreq = this.getBluffFrequency(player.position);

    if (toCall > 0) {
      const potOdds = toCall / (state.pot + toCall);
      const impliedOdds = potOdds * 0.85;

      if (adjustedEquity > 0.7) {
        // Value raise with mixed sizing
        const raiseAction = actions.find(a => a.type === 'raise');
        if (raiseAction) {
          const size = this.chooseRaiseSize(state, adjustedEquity, raiseAction.minAmount, raiseAction.maxAmount);
          return this.makeAction(playerIndex, 'raise', Math.min(size, player.chips, raiseAction.maxAmount), state.street);
        }
      }

      // Semi-bluff raise
      if (adjustedEquity > 0.35 && adjustedEquity < 0.55 && random() < bluffFreq) {
        const raiseAction = actions.find(a => a.type === 'raise');
        if (raiseAction) {
          const size = Math.floor(state.pot * (0.6 + random() * 0.2));
          return this.makeAction(playerIndex, 'raise',
            Math.min(Math.max(size, raiseAction.minAmount), raiseAction.maxAmount, player.chips), state.street);
        }
      }

      if (adjustedEquity > impliedOdds) {
        const callAction = actions.find(a => a.type === 'call' || a.type === 'allin');
        if (callAction) return this.makeAction(playerIndex, callAction.type, callAction.minAmount, state.street);
      }

      return this.makeAction(playerIndex, 'fold', 0, state.street);
    }

    // No bet to face
    if (adjustedEquity > 0.6) {
      const betAction = actions.find(a => a.type === 'bet');
      if (betAction) {
        const size = this.chooseBetSize(state, betAction.minAmount, betAction.maxAmount);
        return this.makeAction(playerIndex, 'bet', Math.min(size, player.chips), state.street);
      }
    }

    // Bluff bet
    if (adjustedEquity < 0.3 && random() < bluffFreq * 0.5) {
      const betAction = actions.find(a => a.type === 'bet');
      if (betAction) {
        const size = Math.floor(state.pot * (0.3 + random() * 0.4));
        return this.makeAction(playerIndex, 'bet',
          Math.min(Math.max(size, betAction.minAmount), betAction.maxAmount, player.chips), state.street);
      }
    }

    return this.makeAction(playerIndex, 'check', 0, state.street);
  }

  private estimateEquity(state: GameState, playerIndex: number): number {
    const player = state.players[playerIndex];

    if (state.board.length === 0) {
      return evaluatePreflopStrength(player.holeCards, state.variant);
    }

    const result = state.variant === 'plo'
      ? evaluatePloHand(player.holeCards, state.board)
      : evaluateHand([...player.holeCards, ...state.board]);

    const rawEquity = 1 - (result.rank - 1) / 7461;
    const numOpponents = state.players.filter(p => p.isActive && p.id !== player.id).length;
    return Math.pow(rawEquity, 1 + numOpponents * 0.15);
  }

  private getBluffFrequency(position: string): number {
    const base = 0.25;
    const posBonus: Record<string, number> = { 'BTN': 0.15, 'CO': 0.10, 'SB': 0.05 };
    return base + (posBonus[position] || 0);
  }

  private chooseRaiseSize(state: GameState, equity: number, min: number, max: number): number {
    if (equity > 0.85) {
      return Math.max(min, Math.floor(state.pot * (0.75 + random() * 0.5)));
    }
    return Math.max(min, Math.floor(state.pot * (0.5 + random() * 0.25)));
  }

  private chooseBetSize(state: GameState, min: number, max: number): number {
    const roll = random();
    if (roll < 0.3) return Math.max(min, Math.floor(state.pot * 0.33));
    if (roll < 0.7) return Math.max(min, Math.floor(state.pot * 0.66));
    return Math.max(min, Math.floor(state.pot * 1.0));
  }

  private makeAction(playerId: number, type: ActionRecord['type'], amount: number, street: GameState['street']): ActionRecord {
    return { playerId, type, amount, street, timestamp: Date.now() };
  }
}

const POSITION_BONUS: Record<string, number> = {
  'UTG': -0.04, 'UTG1': -0.03, 'MP': -0.01, 'MP1': 0,
  'HJ': 0.02, 'CO': 0.04, 'BTN': 0.06, 'SB': -0.02, 'BB': 0,
};
