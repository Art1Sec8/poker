import {
  ActionRecord,
  Card,
  GameState,
  GameVariant,
  PlayerState,
  Position,
  Street,
} from './types';
import { newShuffledDeck, dealCards } from './deck';
import { evaluateHand, compareHands } from './hand-evaluator';
import { evaluatePloHand } from './plo-evaluator';

const POSITIONS_BY_SIZE: Record<number, Position[]> = {
  2: ['SB', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['BTN', 'CO', 'SB', 'BB'],
  5: ['BTN', 'CO', 'MP', 'SB', 'BB'],
  6: ['BTN', 'CO', 'HJ', 'MP', 'SB', 'BB'],
  7: ['BTN', 'CO', 'HJ', 'MP', 'MP1', 'SB', 'BB'],
  8: ['BTN', 'CO', 'HJ', 'MP', 'MP1', 'UTG1', 'SB', 'BB'],
  9: ['BTN', 'CO', 'HJ', 'MP', 'MP1', 'UTG1', 'UTG', 'SB', 'BB'],
};

const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river'];

/**
 * Create a new hand with the given players and settings.
 */
export function createNewHand(
  players: Omit<PlayerState, 'holeCards' | 'currentBet' | 'totalBetThisHand' | 'isActive' | 'position'>[],
  variant: GameVariant,
  smallBlind: number,
  bigBlind: number,
  dealerIndex: number,
  handNumber: number,
): GameState {
  const deck = newShuffledDeck();
  const numPlayers = players.length;
  const positions = POSITIONS_BY_SIZE[numPlayers] || POSITIONS_BY_SIZE[9];
  const cardsPerPlayer = variant === 'plo' ? 4 : 2;

  // Assign positions relative to dealer
  const activePlayers: PlayerState[] = players.map((p, i) => {
    const posIdx = (i - dealerIndex + numPlayers) % numPlayers;
    return {
      ...p,
      holeCards: [],
      currentBet: 0,
      totalBetThisHand: 0,
      isActive: !p.isSittingOut,
      position: positions[posIdx % positions.length],
    };
  });

  // Deal hole cards
  for (const player of activePlayers) {
    if (player.isActive) {
      player.holeCards = dealCards(deck, cardsPerPlayer);
    }
  }

  // Post blinds
  const sbIdx = numPlayers === 2 ? dealerIndex : (dealerIndex + 1) % numPlayers;
  const bbIdx = (sbIdx + 1) % numPlayers;

  const sbPlayer = activePlayers[sbIdx];
  const bbPlayer = activePlayers[bbIdx];
  const sbAmount = Math.min(smallBlind, sbPlayer.chips);
  const bbAmount = Math.min(bigBlind, bbPlayer.chips);

  sbPlayer.chips -= sbAmount;
  sbPlayer.currentBet = sbAmount;
  sbPlayer.totalBetThisHand = sbAmount;

  bbPlayer.chips -= bbAmount;
  bbPlayer.currentBet = bbAmount;
  bbPlayer.totalBetThisHand = bbAmount;

  // First to act preflop is UTG (after BB)
  const firstToAct = (bbIdx + 1) % numPlayers;

  return {
    variant,
    street: 'preflop',
    board: [],
    pot: sbAmount + bbAmount,
    sidePots: [],
    players: activePlayers,
    currentPlayerIndex: firstToAct,
    dealerIndex,
    deck,
    actionHistory: [],
    smallBlind,
    bigBlind,
    minRaise: bigBlind,
    handNumber,
    isHandComplete: false,
  };
}

/**
 * Advance to the next street. Deals community cards and resets betting.
 */
export function advanceStreet(state: GameState): GameState {
  const newState = structuredClone(state);
  const streetIdx = STREET_ORDER.indexOf(newState.street);

  if (streetIdx >= STREET_ORDER.length - 1) {
    // Already on river, go to showdown
    return resolveShowdown(newState);
  }

  const nextStreet = STREET_ORDER[streetIdx + 1];
  newState.street = nextStreet;

  // Deal community cards
  switch (nextStreet) {
    case 'flop':
      newState.board.push(...dealCards(newState.deck, 3));
      break;
    case 'turn':
    case 'river':
      newState.board.push(...dealCards(newState.deck, 1));
      break;
  }

  // Reset current bets for new street
  for (const player of newState.players) {
    player.currentBet = 0;
  }
  newState.minRaise = newState.bigBlind;

  // First to act post-flop: first active player after dealer
  const dealerIdx = newState.dealerIndex;
  let nextPlayer = (dealerIdx + 1) % newState.players.length;
  while (!newState.players[nextPlayer].isActive || newState.players[nextPlayer].chips === 0) {
    nextPlayer = (nextPlayer + 1) % newState.players.length;
    if (nextPlayer === dealerIdx) break;
  }
  newState.currentPlayerIndex = nextPlayer;

  return newState;
}

/**
 * Check if the current street's betting is complete.
 */
export function isStreetComplete(state: GameState): boolean {
  const activePlayers = state.players.filter(p => p.isActive);

  // Only one player left
  if (activePlayers.length <= 1) return true;

  // All active players with chips have equal bets (or are all-in)
  const playersWithChips = activePlayers.filter(p => p.chips > 0);
  if (playersWithChips.length === 0) return true;

  const maxBet = Math.max(...activePlayers.map(p => p.currentBet));
  const allMatched = playersWithChips.every(p => p.currentBet === maxBet);

  // All must have acted at least once (check action history for this street)
  const streetActions = state.actionHistory.filter(a => a.street === state.street);
  const actedPlayerIds = new Set(streetActions.map(a => a.playerId));
  const allActed = playersWithChips.every(p => actedPlayerIds.has(p.id));

  return allMatched && allActed;
}

/**
 * Check if only one player remains (everyone else folded).
 */
export function isHandOver(state: GameState): boolean {
  return state.players.filter(p => p.isActive).length <= 1;
}

/**
 * Resolve the showdown: evaluate hands and determine winner(s).
 */
export function resolveShowdown(state: GameState): GameState {
  const newState = structuredClone(state);
  const activePlayers = newState.players.filter(p => p.isActive);

  if (activePlayers.length === 1) {
    // Last player standing wins the pot
    activePlayers[0].chips += newState.pot;
    newState.pot = 0;
    newState.isHandComplete = true;
    return newState;
  }

  // Evaluate each active player's hand
  const evaluations = activePlayers.map(p => {
    const result = newState.variant === 'plo'
      ? evaluatePloHand(p.holeCards, newState.board)
      : evaluateHand([...p.holeCards, ...newState.board]);
    return { player: p, result };
  });

  // Find the best hand(s)
  evaluations.sort((a, b) => a.result.rank - b.result.rank);
  const bestRank = evaluations[0].result.rank;
  const winners = evaluations.filter(e => e.result.rank === bestRank);

  // Split pot among winners
  const share = Math.floor(newState.pot / winners.length);
  const remainder = newState.pot - share * winners.length;

  for (let i = 0; i < winners.length; i++) {
    winners[i].player.chips += share + (i === 0 ? remainder : 0);
  }

  newState.pot = 0;
  newState.isHandComplete = true;
  return newState;
}

/**
 * Get the next active player index.
 */
export function getNextPlayerIndex(state: GameState): number {
  let idx = (state.currentPlayerIndex + 1) % state.players.length;
  let attempts = 0;
  while (attempts < state.players.length) {
    const player = state.players[idx];
    if (player.isActive && player.chips > 0) return idx;
    idx = (idx + 1) % state.players.length;
    attempts++;
  }
  return state.currentPlayerIndex;
}
