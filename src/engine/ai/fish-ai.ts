import { AIPlayer } from './ai-player';
import { ActionRecord, GameState } from '../types';
import { getValidActions, getAmountToCall } from '../betting';
import { random } from '../rng';

/**
 * Fish AI: Loose-passive player.
 * - Calls too often, rarely raises
 * - No positional awareness
 * - Occasionally makes random bets
 */
export class FishAI implements AIPlayer {
  difficulty = 'fish' as const;

  decide(state: GameState, playerIndex: number): ActionRecord {
    const tempState = { ...state, currentPlayerIndex: playerIndex };
    const actions = getValidActions(tempState);
    if (actions.length === 0) {
      return this.makeAction(playerIndex, 'check', 0, state.street);
    }

    const toCall = getAmountToCall(tempState);
    const player = state.players[playerIndex];
    const roll = random();

    if (toCall > 0) {
      // Facing a bet
      const potRatio = toCall / Math.max(state.pot, 1);
      if (potRatio > 0.5 && roll < 0.15) {
        return this.makeAction(playerIndex, 'fold', 0, state.street);
      }
      if (roll < 0.85) {
        const callAction = actions.find(a => a.type === 'call' || a.type === 'allin');
        if (callAction) return this.makeAction(playerIndex, callAction.type, callAction.minAmount, state.street);
      }
      // Rare raise
      const raiseAction = actions.find(a => a.type === 'raise');
      if (raiseAction) {
        return this.makeAction(playerIndex, 'raise', raiseAction.minAmount, state.street);
      }
      const callAction = actions.find(a => a.type === 'call' || a.type === 'allin');
      if (callAction) return this.makeAction(playerIndex, callAction.type, callAction.minAmount, state.street);
      return this.makeAction(playerIndex, 'fold', 0, state.street);
    }

    // No bet to face
    if (roll < 0.7) {
      return this.makeAction(playerIndex, 'check', 0, state.street);
    }
    const betAction = actions.find(a => a.type === 'bet');
    if (betAction) {
      return this.makeAction(playerIndex, 'bet', betAction.minAmount, state.street);
    }
    return this.makeAction(playerIndex, 'check', 0, state.street);
  }

  private makeAction(playerId: number, type: ActionRecord['type'], amount: number, street: GameState['street']): ActionRecord {
    return { playerId, type, amount, street, timestamp: Date.now() };
  }
}
