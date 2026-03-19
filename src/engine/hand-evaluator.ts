import { Card, HandCategory, HandRankResult, Rank } from './types';
import { cardRank, cardSuit, rankName } from './card';

// ============================================================
// Hand Evaluator
// Evaluates 5-card poker hands and returns a rank (1=best, 7462=worst).
// For 6 or 7 cards, finds the best 5-card combination.
// ============================================================

const HAND_CATEGORY_NAMES: Record<HandCategory, string> = {
  'royal-flush': 'Royal Flush',
  'straight-flush': 'Straight Flush',
  'four-of-a-kind': 'Four of a Kind',
  'full-house': 'Full House',
  'flush': 'Flush',
  'straight': 'Straight',
  'three-of-a-kind': 'Three of a Kind',
  'two-pair': 'Two Pair',
  'one-pair': 'One Pair',
  'high-card': 'High Card',
};

// Rank boundaries (inclusive). Lower rank = better hand.
// 1-10: straight flushes (including royal)
// 11-166: four of a kind
// 167-322: full house
// 323-1599: flush
// 1600-1609: straight
// 1610-2467: three of a kind
// 2468-3325: two pair
// 3326-6185: one pair
// 6186-7462: high card

function getCategoryFromRank(rank: number): HandCategory {
  if (rank <= 1) return 'royal-flush';
  if (rank <= 10) return 'straight-flush';
  if (rank <= 166) return 'four-of-a-kind';
  if (rank <= 322) return 'full-house';
  if (rank <= 1599) return 'flush';
  if (rank <= 1609) return 'straight';
  if (rank <= 2467) return 'three-of-a-kind';
  if (rank <= 3325) return 'two-pair';
  if (rank <= 6185) return 'one-pair';
  return 'high-card';
}

/**
 * Evaluate exactly 5 cards and return a numeric rank (1=best, 7462=worst).
 */
function evaluate5(cards: Card[]): number {
  const ranks = cards.map(cardRank).sort((a, b) => b - a); // descending
  const suits = cards.map(cardSuit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check for straight
  let isStraight = false;
  let straightHigh = -1;

  // Normal straight check
  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
    isStraight = true;
    straightHigh = ranks[0];
  }
  // Wheel (A-2-3-4-5): A=12, 5=3, 4=2, 3=1, 2=0
  if (!isStraight && ranks[0] === 12 && ranks[1] === 3 && ranks[2] === 2 && ranks[3] === 1 && ranks[4] === 0) {
    isStraight = true;
    straightHigh = 3; // 5-high straight
  }

  // Count rank frequencies
  const freq = new Map<number, number>();
  for (const r of ranks) freq.set(r, (freq.get(r) || 0) + 1);
  const freqEntries = [...freq.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // by count desc
    return b[0] - a[0]; // by rank desc
  });

  const counts = freqEntries.map(e => e[1]);
  const countRanks = freqEntries.map(e => e[0]);

  // Straight flush / Royal flush
  if (isFlush && isStraight) {
    if (straightHigh === 12) return 1; // Royal flush
    // Straight flushes: King-high=2, Queen-high=3, ..., 5-high=10
    return 10 - (straightHigh - 3);
  }

  // Four of a kind
  if (counts[0] === 4) {
    // Rank based on quad rank then kicker
    const quadRank = countRanks[0];
    const kicker = countRanks[1];
    return 11 + (12 - quadRank) * 12 + (12 - kicker);
  }

  // Full house
  if (counts[0] === 3 && counts[1] === 2) {
    const tripRank = countRanks[0];
    const pairRank = countRanks[1];
    return 167 + (12 - tripRank) * 12 + (12 - pairRank);
  }

  // Flush
  if (isFlush) {
    return 323 + rankHighCardValue(ranks, 1277);
  }

  // Straight
  if (isStraight) {
    return 1600 + (12 - straightHigh);
  }

  // Three of a kind
  if (counts[0] === 3) {
    const tripRank = countRanks[0];
    const kickers = countRanks.slice(1);
    return 1610 + (12 - tripRank) * 66 + kickerValue(kickers, 66);
  }

  // Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    const highPair = Math.max(countRanks[0], countRanks[1]);
    const lowPair = Math.min(countRanks[0], countRanks[1]);
    const kicker = countRanks[2];
    return 2468 + (12 - highPair) * 66 + (12 - lowPair) * 5 + (12 - kicker);
  }

  // One pair
  if (counts[0] === 2) {
    const pairRank = countRanks[0];
    const kickers = countRanks.slice(1);
    return 3326 + (12 - pairRank) * 220 + kickerValue(kickers, 220);
  }

  // High card
  return 6186 + rankHighCardValue(ranks, 1277);
}

function rankHighCardValue(sortedRanks: number[], maxVal: number): number {
  // Map sorted descending ranks to a unique value within maxVal range
  let val = 0;
  for (let i = 0; i < sortedRanks.length; i++) {
    val = val * 13 + (12 - sortedRanks[i]);
  }
  return Math.min(val, maxVal - 1);
}

function kickerValue(kickers: number[], maxVal: number): number {
  let val = 0;
  for (const k of kickers) {
    val = val * 13 + (12 - k);
  }
  return Math.min(val, maxVal - 1);
}

/**
 * Generate all C(n, k) combinations of indices.
 */
function* combinations(n: number, k: number): Generator<number[]> {
  const indices = Array.from({ length: k }, (_, i) => i);
  yield [...indices];
  while (true) {
    let i = k - 1;
    while (i >= 0 && indices[i] === i + n - k) i--;
    if (i < 0) return;
    indices[i]++;
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
    yield [...indices];
  }
}

/**
 * Evaluate the best 5-card hand from 5, 6, or 7 cards.
 */
export function evaluateHand(cards: Card[]): HandRankResult {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`evaluateHand expects 5-7 cards, got ${cards.length}`);
  }

  let bestRank = Infinity;

  if (cards.length === 5) {
    bestRank = evaluate5(cards);
  } else {
    // Try all 5-card combinations
    for (const combo of combinations(cards.length, 5)) {
      const hand = combo.map(i => cards[i]);
      const rank = evaluate5(hand);
      if (rank < bestRank) bestRank = rank;
    }
  }

  const category = getCategoryFromRank(bestRank);
  return {
    rank: bestRank,
    category,
    description: HAND_CATEGORY_NAMES[category],
  };
}

/**
 * Compare two hand rank results. Returns negative if a is better, positive if b is better, 0 if tied.
 */
export function compareHands(a: HandRankResult, b: HandRankResult): number {
  return a.rank - b.rank;
}

/**
 * Get a human-readable description of a hand category.
 */
export function handCategoryName(category: HandCategory): string {
  return HAND_CATEGORY_NAMES[category];
}
