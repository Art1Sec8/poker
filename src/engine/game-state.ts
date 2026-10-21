import {
  GameState,
  GameVariant,
  PlayerState,
  Position,
  SidePot,
  Street,
} from './types';
import { newShuffledDeck, dealCards } from './deck';
import { evaluateHand } from './hand-evaluator';
import { evaluatePloHand } from './plo-evaluator';

// ============================================================
// Position assignments by table size
//
// Positions are assigned relative to the dealer button.
// Index 0 = dealer position (BTN in 3+ players).
//
// Heads-up (2 players) special rules:
//   - Dealer posts SB and acts FIRST preflop
//   - Non-dealer posts BB and acts FIRST post-flop
// ============================================================

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
  const numPlayers = players.length;
  if (numPlayers < 2 || numPlayers > 9) {
    throw new Error(`Invalid number of players: ${numPlayers} (must be 2-9)`);
  }

  const deck = newShuffledDeck();
  const positions = POSITIONS_BY_SIZE[numPlayers];
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
      position: positions[posIdx],
    };
  });

  // Deal hole cards
  for (const player of activePlayers) {
    if (player.isActive) {
      player.holeCards = dealCards(deck, cardsPerPlayer);
    }
  }

  // Post blinds
  // Heads-up: dealer = SB (index 0 in positions), other = BB
  // 3+ players: SB = dealer+1, BB = dealer+2
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

  // First to act preflop:
  // Heads-up: dealer/SB acts first (which is dealerIndex)
  // 3+ players: UTG (player after BB)
  // In heads-up, (bbIdx + 1) % 2 wraps to sbIdx = dealerIndex, which is correct.
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

  // Post-flop: first active player with chips after dealer
  // In heads-up, dealer+1 = non-dealer = BB, which acts first post-flop (correct)
  newState.currentPlayerIndex = findFirstActivePlayer(
    newState.players,
    newState.dealerIndex,
  );

  return newState;
}

/**
 * Find the first active player with chips, starting after startIndex.
 */
function findFirstActivePlayer(players: PlayerState[], startIndex: number): number {
  const n = players.length;
  for (let offset = 1; offset <= n; offset++) {
    const idx = (startIndex + offset) % n;
    if (players[idx].isActive && players[idx].chips > 0) return idx;
  }
  // All players are all-in or folded — return first active
  for (let offset = 1; offset <= n; offset++) {
    const idx = (startIndex + offset) % n;
    if (players[idx].isActive) return idx;
  }
  return startIndex;
}

/**
 * Check if the current street's betting is complete.
 *
 * Conditions for street completion:
 * 1. Only one active player remains (everyone else folded)
 * 2. All active players with chips have matched the highest bet AND have acted
 * 3. Special case: preflop BB option — BB must act even if no one raised
 */
export function isStreetComplete(state: GameState): boolean {
  const activePlayers = state.players.filter(p => p.isActive);

  // Only one player left → hand is over
  if (activePlayers.length <= 1) return true;

  // All active players with chips have equal bets (or are all-in)
  const playersWithChips = activePlayers.filter(p => p.chips > 0);
  if (playersWithChips.length === 0) return true; // everyone all-in

  const maxBet = Math.max(...activePlayers.map(p => p.currentBet));
  const allMatched = playersWithChips.every(p => p.currentBet === maxBet);
  if (!allMatched) return false;

  // All players with chips must have acted at least once this street
  const streetActions = state.actionHistory.filter(a => a.street === state.street);
  const actedPlayerIds = new Set(streetActions.map(a => a.playerId));
  const allActed = playersWithChips.every(p => actedPlayerIds.has(p.id));
  if (!allActed) return false;

  // BB option: preflop, if no one has raised above the BB, the BB gets to act
  // even though their "bet" matches (they posted the blind, not a voluntary action).
  if (state.street === 'preflop') {
    const bbPlayer = state.players.find(p => p.position === 'BB' && p.isActive && p.chips > 0);
    if (bbPlayer && maxBet === state.bigBlind) {
      // BB hasn't voluntarily acted — check if their only "action" was posting the blind
      const bbActions = streetActions.filter(a => a.playerId === bbPlayer.id);
      if (bbActions.length === 0) return false; // BB hasn't acted yet
    }
  }

  return true;
}

/**
 * Check if only one player remains (everyone else folded).
 */
export function isHandOver(state: GameState): boolean {
  return state.players.filter(p => p.isActive).length <= 1;
}

// ============================================================
// Side Pot Calculation
//
// When players are all-in for different amounts, the pot is split
// into main pot + side pots. Each pot is only contestable by
// players who contributed enough.
//
// Example: A all-in $50, B all-in $100, C calls $100
//   Main pot: $150 (A=$50, B=$50, C=$50) — A, B, C eligible
//   Side pot: $100 (B=$50, C=$50)        — B, C eligible
//
// Algorithm:
// 1. Sort active players by totalBetThisHand ascending
// 2. For each unique bet level, create a pot from the contributions
//    up to that level from all eligible players
// ============================================================

export function calculateSidePots(players: PlayerState[]): SidePot[] {
  const activePlayers = players
    .filter(p => p.isActive || p.totalBetThisHand > 0)
    .sort((a, b) => a.totalBetThisHand - b.totalBetThisHand);

  if (activePlayers.length === 0) return [];

  const pots: SidePot[] = [];
  let prevLevel = 0;

  const processedLevels = new Set<number>();

  for (const player of activePlayers) {
    const level = player.totalBetThisHand;
    if (level <= prevLevel || processedLevels.has(level)) continue;
    processedLevels.add(level);

    const contribution = level - prevLevel;
    const eligible = activePlayers.filter(p => p.totalBetThisHand >= level && p.isActive);
    const contributors = activePlayers.filter(p => p.totalBetThisHand >= level);
    const potAmount = contribution * contributors.length;

    if (potAmount > 0 && eligible.length > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayerIds: eligible.map(p => p.id),
      });
    }

    prevLevel = level;
  }

  return pots;
}

/**
 * Resolve the showdown: evaluate hands and determine winner(s).
 * Handles side pots correctly.
 */
export function resolveShowdown(state: GameState): GameState {
  const newState = structuredClone(state);
  const activePlayers = newState.players.filter(p => p.isActive);

  if (activePlayers.length === 1) {
    // Last player standing wins everything
    const w = activePlayers[0];
    w.chips += newState.pot;
    newState.isHandComplete = true;
    newState.showdownResult = {
      winners: [{ id: w.id, name: w.name, amount: newState.pot, handDescription: null }],
      handDescription: null,
      wonByFold: true,
    };
    return newState;
  }

  // Calculate side pots
  const sidePots = calculateSidePots(newState.players);
  newState.sidePots = sidePots;

  // Evaluate each active player's hand
  const evaluations = new Map<number, { rank: number; description: string }>();
  for (const p of activePlayers) {
    const result = newState.variant === 'plo'
      ? evaluatePloHand(p.holeCards, newState.board)
      : evaluateHand([...p.holeCards, ...newState.board]);
    evaluations.set(p.id, { rank: result.rank, description: result.description });
  }

  // Award each pot to the winner(s) among eligible players, tracking winnings.
  const winnings = new Map<number, number>();
  let totalAwarded = 0;
  for (const pot of sidePots) {
    const eligible = pot.eligiblePlayerIds
      .map(id => ({ id, rank: evaluations.get(id)?.rank ?? Infinity }))
      .filter(e => e.rank < Infinity);

    if (eligible.length === 0) continue;

    const bestRank = Math.min(...eligible.map(e => e.rank));
    const winners = eligible.filter(e => e.rank === bestRank);
    const share = Math.floor(pot.amount / winners.length);
    const remainder = pot.amount - share * winners.length;

    for (let i = 0; i < winners.length; i++) {
      const amt = share + (i === 0 ? remainder : 0);
      const player = newState.players.find(p => p.id === winners[i].id)!;
      player.chips += amt;
      winnings.set(player.id, (winnings.get(player.id) ?? 0) + amt);
    }
    totalAwarded += pot.amount;
  }

  // Any remaining pot (rounding) goes to first winner
  const unawarded = newState.pot - totalAwarded;
  if (unawarded > 0 && activePlayers.length > 0) {
    const bestRank = Math.min(...activePlayers.map(p => evaluations.get(p.id)?.rank ?? Infinity));
    const winner = activePlayers.find(p => evaluations.get(p.id)?.rank === bestRank);
    if (winner) {
      winner.chips += unawarded;
      winnings.set(winner.id, (winnings.get(winner.id) ?? 0) + unawarded);
    }
  }

  // Record the result: who won, how much, and the best winning hand shown.
  const overallBestRank = Math.min(...activePlayers.map(p => evaluations.get(p.id)?.rank ?? Infinity));
  const bestPlayer = activePlayers.find(p => evaluations.get(p.id)?.rank === overallBestRank);
  newState.showdownResult = {
    winners: [...winnings.entries()]
      .filter(([, amt]) => amt > 0)
      .map(([id, amount]) => ({
        id,
        name: newState.players.find(p => p.id === id)!.name,
        amount,
        // Each winner's own hand — a side-pot winner may differ from bestPlayer.
        handDescription: evaluations.get(id)?.description ?? null,
      })),
    handDescription: bestPlayer ? evaluations.get(bestPlayer.id)!.description : null,
    wonByFold: false,
  };

  newState.isHandComplete = true;
  return newState;
}

/**
 * Get the next active player index.
 */
export function getNextPlayerIndex(state: GameState): number {
  return findFirstActivePlayer(state.players, state.currentPlayerIndex);
}
