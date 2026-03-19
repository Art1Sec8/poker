import { AIPlayer } from './ai-player';
import { ActionRecord, GameState } from '../types';
import { getValidActions, getAmountToCall } from '../betting';

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
    const player = state.players[playerIndex];
    const toCall = getAmountToCall(tempState);

    const roll = Math.random();

    // Fish calls most of the time
    if (toCall > 0) {
      if (roll < 0.15) {
        // Fold occasionally (when facing big bets)
        const potRatio = toCall / Math.max(state.pot, 1);
        if (potRatio > 0.5 && Math.random() < 0.4) {
          return this.makeAction(playerIndex, 'fold', 0, state.street);
        }
        return this.makeAction(playerIndex, 'call', toCall, state.street);
      }
      if (roll < 0.85) {
        // Call
        return this.makeAction(playerIndex, 'call', Math.min(toCall, player.chips), state.street);
      }
      // Rare raise
      const raiseAction = actions.find(a => a.type === 'raise');
      if (raiseAction) {
        const amount = raiseAction.minAmount;
        return this.makeAction(playerIndex, 'raise', amount, state.street);
      }
      return this.makeAction(playerIndex, 'call', Math.min(toCall, player.chips), state.street);
    }

    // No bet to face
    if (roll < 0.7) {
      return this.makeAction(playerIndex, 'check', 0, state.street);
    }

    // Small bet occasionally
    const betAction = actions.find(a => a.type === 'bet');
    if (betAction) {
      const amount = betAction.minAmount;
      return this.makeAction(playerIndex, 'bet', amount, state.street);
    }

    return this.makeAction(playerIndex, 'check', 0, state.street);
  }

  private makeAction(playerId: number, type: ActionRecord['type'], amount: number, street: GameState['street']): ActionRecord {
    return { playerId, type, amount, street, timestamp: Date.now() };
  }
}
