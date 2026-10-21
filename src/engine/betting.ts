import { ActionRecord, GameState, ValidAction } from './types';
import { validateAction } from './validation';

/**
 * Get valid actions for the current player.
 */
export function getValidActions(state: GameState): ValidAction[] {
  const player = state.players[state.currentPlayerIndex];
  if (!player || !player.isActive) return [];

  const actions: ValidAction[] = [];
  const toCall = getAmountToCall(state);

  // Fold (if there's a bet to face)
  if (toCall > 0) {
    actions.push({ type: 'fold', minAmount: 0, maxAmount: 0 });
  }

  // Check (if no bet to face)
  if (toCall === 0) {
    actions.push({ type: 'check', minAmount: 0, maxAmount: 0 });
  }

  // Call
  if (toCall > 0 && player.chips > 0) {
    if (player.chips <= toCall) {
      // Can only call all-in
      actions.push({ type: 'allin', minAmount: player.chips, maxAmount: player.chips });
    } else {
      actions.push({ type: 'call', minAmount: toCall, maxAmount: toCall });
    }
  }

  // Bet (if no bet to face)
  if (toCall === 0 && player.chips > 0) {
    const minBet = state.bigBlind;
    const maxBet = getMaxBet(state);
    if (player.chips <= minBet) {
      actions.push({ type: 'allin', minAmount: player.chips, maxAmount: player.chips });
    } else {
      actions.push({ type: 'bet', minAmount: minBet, maxAmount: Math.min(maxBet, player.chips) });
    }
  }

  // Raise (if there's a bet to face and enough chips)
  if (toCall > 0 && player.chips > toCall) {
    const minRaise = toCall + state.minRaise;
    const maxRaise = getMaxRaise(state);
    if (player.chips <= minRaise) {
      // Can only raise all-in
      if (!actions.some(a => a.type === 'allin')) {
        actions.push({ type: 'allin', minAmount: player.chips, maxAmount: player.chips });
      }
    } else {
      actions.push({ type: 'raise', minAmount: minRaise, maxAmount: Math.min(maxRaise, player.chips) });
    }
  }

  return actions;
}

/**
 * Calculate the amount the current player needs to call.
 */
export function getAmountToCall(state: GameState): number {
  const player = state.players[state.currentPlayerIndex];
  const maxBet = Math.max(...state.players.filter(p => p.isActive).map(p => p.currentBet));
  return Math.max(0, maxBet - player.currentBet);
}

/**
 * Get maximum bet amount based on game variant.
 */
function getMaxBet(state: GameState): number {
  if (state.variant === 'plo') {
    return calculatePotLimit(state);
  }
  return state.players[state.currentPlayerIndex].chips;
}

/**
 * Get maximum raise amount based on game variant.
 */
function getMaxRaise(state: GameState): number {
  if (state.variant === 'plo') {
    return calculatePotLimit(state);
  }
  return state.players[state.currentPlayerIndex].chips;
}

/**
 * Calculate pot-limit max bet/raise (for PLO).
 *
 * Pot-limit formula:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  max_raise = call_amount + pot_after_call                  │
 * │                                                             │
 * │  pot_after_call = pot                                       │
 * │                 + sum of all current street bets            │
 * │                 + call_amount (what we'd put in to call)    │
 * │                                                             │
 * │  Example: pot=$100, opp bets $50, we have $200             │
 * │    call_amount = $50                                        │
 * │    pot_after_call = $100 + $50(opp bet) + $50(our call)    │
 * │                   = $200                                    │
 * │    max_raise = $50 + $200 = $250 total chips committed     │
 * └─────────────────────────────────────────────────────────────┘
 */
export function calculatePotLimit(state: GameState): number {
  const toCall = getAmountToCall(state);
  // Sum of all current bets on this street (from all players, not just active)
  const streetBets = state.players.reduce((sum, p) => sum + p.currentBet, 0);
  const potAfterCall = state.pot + streetBets + toCall;
  return toCall + potAfterCall;
}

/**
 * Apply an action to the game state. Validates the action first.
 * Returns a new state (immutable).
 */
export function applyAction(state: GameState, action: ActionRecord): GameState {
  // Validate the action is legal
  validateAction(state, action);

  const newState = structuredClone(state);
  const player = newState.players.find(p => p.id === action.playerId)!;

  newState.actionHistory.push(action);

  switch (action.type) {
    case 'fold':
      player.isActive = false;
      break;

    case 'check':
      break;

    case 'call': {
      const amount = Math.min(action.amount, player.chips);
      player.chips -= amount;
      player.currentBet += amount;
      player.totalBetThisHand += amount;
      newState.pot += amount;
      break;
    }

    case 'bet':
    case 'raise': {
      const amount = action.amount;
      player.chips -= amount;
      player.currentBet += amount;
      player.totalBetThisHand += amount;
      newState.pot += amount;
      const raiseSize = player.currentBet - Math.max(
        ...state.players.filter(p => p.isActive && p.id !== player.id).map(p => p.currentBet),
        0
      );
      if (raiseSize > newState.minRaise) {
        newState.minRaise = raiseSize;
      }
      break;
    }

    case 'allin': {
      const amount = player.chips;
      player.chips = 0;
      player.currentBet += amount;
      player.totalBetThisHand += amount;
      newState.pot += amount;
      // If this all-in constitutes a full raise, update minRaise so the next
      // player's minimum legal raise is computed correctly (matches bet/raise).
      const raiseSize = player.currentBet - Math.max(
        ...state.players.filter(p => p.isActive && p.id !== player.id).map(p => p.currentBet),
        0
      );
      if (raiseSize > newState.minRaise) {
        newState.minRaise = raiseSize;
      }
      break;
    }
  }

  return newState;
}
