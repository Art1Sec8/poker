import { Card, GameState, ActionRecord, GameVariant } from './types';
import { getValidActions } from './betting';

/**
 * Validate that cards are in range [0,51] with no duplicates.
 * Throws on invalid input.
 */
export function validateCards(cards: Card[], label: string = 'cards'): void {
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (!Number.isInteger(c) || c < 0 || c > 51) {
      throw new Error(`Invalid card in ${label}: ${c} at index ${i} (must be integer 0-51)`);
    }
  }
  const seen = new Set<number>();
  for (const c of cards) {
    if (seen.has(c)) {
      throw new Error(`Duplicate card in ${label}: ${c}`);
    }
    seen.add(c);
  }
}

/**
 * Validate hole cards for a given variant.
 */
export function validateHoleCards(cards: Card[], variant: GameVariant): void {
  const expected = variant === 'plo' ? 4 : 2;
  if (cards.length !== expected) {
    throw new Error(`${variant} requires ${expected} hole cards, got ${cards.length}`);
  }
  validateCards(cards, 'hole cards');
}

/**
 * Validate board cards (0-5 cards, no duplicates, no overlap with hole cards).
 */
export function validateBoard(board: Card[], allHoleCards: Card[] = []): void {
  if (board.length > 5) {
    throw new Error(`Board cannot have more than 5 cards, got ${board.length}`);
  }
  validateCards(board, 'board');
  // Check for overlap with hole cards
  const holeSet = new Set(allHoleCards);
  for (const c of board) {
    if (holeSet.has(c)) {
      throw new Error(`Board card ${c} is also a hole card`);
    }
  }
}

/**
 * Validate that an action is legal in the current game state.
 * Returns true if valid, throws with explanation if not.
 */
export function validateAction(state: GameState, action: ActionRecord): void {
  const player = state.players.find(p => p.id === action.playerId);
  if (!player) {
    throw new Error(`Player ${action.playerId} not found`);
  }
  if (!player.isActive) {
    throw new Error(`Player ${action.playerId} is not active`);
  }
  if (state.currentPlayerIndex !== state.players.indexOf(player)) {
    throw new Error(`Not player ${action.playerId}'s turn`);
  }

  const validActions = getValidActions(state);
  const matching = validActions.find(va => va.type === action.type);
  if (!matching) {
    const validTypes = validActions.map(a => a.type).join(', ');
    throw new Error(`Action '${action.type}' is not valid. Valid actions: ${validTypes}`);
  }

  // Validate amount is within bounds
  if (action.type === 'bet' || action.type === 'raise') {
    if (action.amount < matching.minAmount || action.amount > matching.maxAmount) {
      throw new Error(
        `${action.type} amount ${action.amount} is out of range [${matching.minAmount}, ${matching.maxAmount}]`
      );
    }
  }
}
