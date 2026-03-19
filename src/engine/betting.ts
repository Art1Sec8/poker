import { ActionRecord, ActionType, GameState, ValidAction } from './types';

/**
 * Get valid actions for the current player.
 */
export function getValidActions(state: GameState): ValidAction[] {
  const player = state.players[state.currentPlayerIndex];
  if (!player || !player.isActive) return [];

  const actions: ValidAction[] = [];
  const toCall = getAmountToCall(state);
  const potAfterCall = state.pot + toCall;

  // Can always fold (if there's a bet to face)
  if (toCall > 0) {
    actions.push({ type: 'fold', minAmount: 0, maxAmount: 0 });
  }

  // Check (if no bet to face)
  if (toCall === 0) {
    actions.push({ type: 'check', minAmount: 0, maxAmount: 0 });
  }

  // Call
  if (toCall > 0) {
    const callAmount = Math.min(toCall, player.chips);
    actions.push({ type: 'call', minAmount: callAmount, maxAmount: callAmount });
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

  // Raise (if there's a bet to face)
  if (toCall > 0 && player.chips > toCall) {
    const minRaise = toCall + state.minRaise;
    const maxRaise = getMaxRaise(state);
    if (player.chips <= minRaise) {
      actions.push({ type: 'allin', minAmount: player.chips, maxAmount: player.chips });
    } else {
      actions.push({ type: 'raise', minAmount: minRaise, maxAmount: Math.min(maxRaise, player.chips) });
    }
  }

  // All-in if can't afford minimum action
  if (player.chips > 0 && !actions.some(a => a.type === 'allin')) {
    if (toCall >= player.chips) {
      actions.push({ type: 'allin', minAmount: player.chips, maxAmount: player.chips });
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
  // No limit hold'em: max is all chips
  return state.players[state.currentPlayerIndex].chips;
}

/**
 * Get maximum raise amount based on game variant.
 */
function getMaxRaise(state: GameState): number {
  const toCall = getAmountToCall(state);
  if (state.variant === 'plo') {
    return calculatePotLimit(state);
  }
  // No limit: max is all chips
  return state.players[state.currentPlayerIndex].chips;
}

/**
 * Calculate pot-limit max bet (for PLO).
 * Pot limit = current pot + all bets on table + amount to call, then raise by that total.
 */
export function calculatePotLimit(state: GameState): number {
  const player = state.players[state.currentPlayerIndex];
  const toCall = getAmountToCall(state);
  const potAfterCall = state.pot + state.players.reduce((sum, p) => sum + p.currentBet, 0) + toCall;
  return toCall + potAfterCall;
}

/**
 * Apply an action to the game state. Returns a new state.
 */
export function applyAction(state: GameState, action: ActionRecord): GameState {
  const newState = structuredClone(state);
  const player = newState.players.find(p => p.id === action.playerId);
  if (!player) throw new Error(`Player ${action.playerId} not found`);

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
      const amount = Math.min(action.amount, player.chips);
      player.chips -= amount;
      player.currentBet += amount;
      player.totalBetThisHand += amount;
      newState.pot += amount;
      // Update min raise
      const raiseSize = amount - getAmountToCall(state);
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
      break;
    }
  }

  return newState;
}
