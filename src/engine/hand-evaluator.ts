import { Card, HandCategory, HandRankResult } from './types';
import { cardRank, cardSuit } from './card';

// ============================================================
// Hand Evaluator — Combinatorial Ranking System
//
// Evaluates 5-card poker hands and returns a rank (1=best, 7462=worst).
// For 6 or 7 cards, finds the best 5-card combination.
//
// Rank ranges by category (lower = better):
//   1        Royal Flush
//   2-10     Straight Flush (K-high down to 5-high/wheel)
//   11-166   Four of a Kind (13 quads × 12 kickers)
//   167-322  Full House (13 trips × 12 pairs)
//   323-1599 Flush (C(13,5)=1287 combos, minus 10 straight flushes)
//   1600-1609 Straight (10 distinct straights)
//   1610-2467 Three of a Kind (13 trips × C(12,2)=66 kicker combos)
//   2468-3325 Two Pair (C(13,2)=78 pair combos × 11 kickers)
//   3326-6185 One Pair (13 pairs × C(12,3)=220 kicker combos)
//   6186-7462 High Card (C(13,5)=1287 combos, minus 10 straights)
//
// Total: 7462 unique hand ranks.
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

// ============================================================
// Precomputed tables for combinatorial ranking
// ============================================================

/**
 * Map 5 sorted descending ranks to a unique index in [0, C(13,5)-1].
 * Uses combinatorial number system: index = C(r0,5) + C(r1,4) + C(r2,3) + C(r3,2) + C(r4,1)
 * where ranks are in descending order.
 */
const CHOOSE: number[][] = buildChooseTable(13, 5);

function buildChooseTable(n: number, k: number): number[][] {
  const table: number[][] = [];
  for (let i = 0; i <= n; i++) {
    table[i] = [];
    for (let j = 0; j <= k; j++) {
      if (j === 0 || j === i) table[i][j] = 1;
      else if (j > i) table[i][j] = 0;
      else table[i][j] = table[i - 1][j - 1] + table[i - 1][j];
    }
  }
  return table;
}

/**
 * Given 5 distinct ranks sorted descending, return a unique index [0..C(13,5)-1].
 */
function rankComboIndex(sorted: number[]): number {
  // sorted is descending: sorted[0] > sorted[1] > ... > sorted[4]
  // Convert to ascending for combinatorial number system
  const asc = [sorted[4], sorted[3], sorted[2], sorted[1], sorted[0]];
  let idx = 0;
  for (let i = 0; i < 5; i++) {
    if (asc[i] >= i + 1) {
      idx += CHOOSE[asc[i]][i + 1];
    }
  }
  return idx;
}

// ============================================================
// Straight detection
// ============================================================

// All 10 possible straights by high card (descending): A,K,Q,...,5
// The wheel (A-2-3-4-5) has high card = 5 (rank 3)
const STRAIGHT_HIGHS = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3]; // A-high down to 5-high

function detectStraight(sortedDesc: number[]): number | null {
  // sortedDesc is 5 ranks sorted high to low, all unique
  // Normal straight: consecutive ranks
  if (sortedDesc[0] - sortedDesc[4] === 4) return sortedDesc[0];
  // Wheel: A-5-4-3-2
  if (sortedDesc[0] === 12 && sortedDesc[1] === 3 && sortedDesc[2] === 2 && sortedDesc[3] === 1 && sortedDesc[4] === 0) {
    return 3; // 5-high
  }
  return null;
}

// ============================================================
// Build flush/non-flush rank lookup tables
//
// These tables map a combinatorial index to a hand rank.
// Flush hands and non-flush hands are ranked separately
// because a flush always beats non-flush of same ranks.
// ============================================================

// Precompute: for each of the C(13,5)=1287 rank combos, determine:
//   - Is it a straight? If so, which?
//   - What's its rank within its category?

interface RankTableEntry {
  handRank: number; // 1-7462
}

const FLUSH_TABLE: Map<number, number> = new Map();
const NON_FLUSH_TABLE_UNIQUE5: Map<number, number> = new Map();

// For non-unique-5 hands (pairs, trips, quads, full houses):
// We encode as: sorted frequency groups → hand rank
// Key: string encoding of (count, rank) pairs sorted by count desc, rank desc

const NON_UNIQUE_TABLE: Map<string, number> = new Map();

function initTables() {
  // --- Straight flushes (ranks 1-10) ---
  // Royal flush = rank 1, K-high SF = 2, ..., wheel SF = 10
  let nextRank = 1;
  for (const high of STRAIGHT_HIGHS) {
    const ranks = high === 3
      ? [12, 3, 2, 1, 0] // wheel
      : [high, high - 1, high - 2, high - 3, high - 4];
    ranks.sort((a, b) => b - a);
    const idx = rankComboIndex(ranks);
    FLUSH_TABLE.set(idx, nextRank);
    nextRank++;
  }
  // nextRank = 11

  // --- Four of a kind (ranks 11-166) ---
  // 13 quad ranks × 12 kicker ranks = 156 combos
  for (let quadRank = 12; quadRank >= 0; quadRank--) {
    for (let kicker = 12; kicker >= 0; kicker--) {
      if (kicker === quadRank) continue;
      const key = encodeFreqs([[4, quadRank], [1, kicker]]);
      NON_UNIQUE_TABLE.set(key, nextRank);
      nextRank++;
    }
  }
  // nextRank = 167

  // --- Full house (ranks 167-322) ---
  // 13 trip ranks × 12 pair ranks = 156 combos
  for (let tripRank = 12; tripRank >= 0; tripRank--) {
    for (let pairRank = 12; pairRank >= 0; pairRank--) {
      if (pairRank === tripRank) continue;
      const key = encodeFreqs([[3, tripRank], [2, pairRank]]);
      NON_UNIQUE_TABLE.set(key, nextRank);
      nextRank++;
    }
  }
  // nextRank = 323

  // --- Flush (ranks 323-1599) ---
  // C(13,5) = 1287 combos minus 10 straight flushes = 1277 non-straight flushes
  const allFiveRankCombos = generateSortedCombos(13, 5);
  for (const combo of allFiveRankCombos) {
    const idx = rankComboIndex(combo);
    if (FLUSH_TABLE.has(idx)) continue; // skip straight flushes (already ranked)
    FLUSH_TABLE.set(idx, nextRank);
    nextRank++;
  }
  // nextRank = 1600

  // --- Straight (ranks 1600-1609) ---
  for (const high of STRAIGHT_HIGHS) {
    const ranks = high === 3
      ? [12, 3, 2, 1, 0]
      : [high, high - 1, high - 2, high - 3, high - 4];
    ranks.sort((a, b) => b - a);
    const idx = rankComboIndex(ranks);
    NON_FLUSH_TABLE_UNIQUE5.set(idx, nextRank);
    nextRank++;
  }
  // nextRank = 1610

  // --- Three of a kind (ranks 1610-2467) ---
  // 13 trip ranks × C(12,2) = 66 kicker combos = 858
  for (let tripRank = 12; tripRank >= 0; tripRank--) {
    const otherRanks = [];
    for (let r = 12; r >= 0; r--) {
      if (r !== tripRank) otherRanks.push(r);
    }
    for (let i = 0; i < otherRanks.length; i++) {
      for (let j = i + 1; j < otherRanks.length; j++) {
        const key = encodeFreqs([[3, tripRank], [1, otherRanks[i]], [1, otherRanks[j]]]);
        NON_UNIQUE_TABLE.set(key, nextRank);
        nextRank++;
      }
    }
  }
  // nextRank = 2468

  // --- Two pair (ranks 2468-3325) ---
  // C(13,2) = 78 pair combos × 11 kickers = 858
  for (let highPair = 12; highPair >= 0; highPair--) {
    for (let lowPair = highPair - 1; lowPair >= 0; lowPair--) {
      for (let kicker = 12; kicker >= 0; kicker--) {
        if (kicker === highPair || kicker === lowPair) continue;
        const key = encodeFreqs([[2, highPair], [2, lowPair], [1, kicker]]);
        NON_UNIQUE_TABLE.set(key, nextRank);
        nextRank++;
      }
    }
  }
  // nextRank = 3326

  // --- One pair (ranks 3326-6185) ---
  // 13 pair ranks × C(12,3) = 220 kicker combos = 2860
  for (let pairRank = 12; pairRank >= 0; pairRank--) {
    const otherRanks = [];
    for (let r = 12; r >= 0; r--) {
      if (r !== pairRank) otherRanks.push(r);
    }
    for (let i = 0; i < otherRanks.length; i++) {
      for (let j = i + 1; j < otherRanks.length; j++) {
        for (let k = j + 1; k < otherRanks.length; k++) {
          const key = encodeFreqs([[2, pairRank], [1, otherRanks[i]], [1, otherRanks[j]], [1, otherRanks[k]]]);
          NON_UNIQUE_TABLE.set(key, nextRank);
          nextRank++;
        }
      }
    }
  }
  // nextRank = 6186

  // --- High card (ranks 6186-7462) ---
  // C(13,5) = 1287 combos minus 10 straights = 1277
  for (const combo of allFiveRankCombos) {
    const idx = rankComboIndex(combo);
    if (NON_FLUSH_TABLE_UNIQUE5.has(idx)) continue; // skip straights
    NON_FLUSH_TABLE_UNIQUE5.set(idx, nextRank);
    nextRank++;
  }
  // nextRank should be 7463 (ranks 1..7462)
}

function encodeFreqs(groups: [number, number][]): string {
  // Sort by count desc, then rank desc within same count
  const sorted = [...groups].sort((a, b) => {
    if (b[0] !== a[0]) return b[0] - a[0];
    return b[1] - a[1];
  });
  return sorted.map(([c, r]) => `${c}:${r}`).join(',');
}

function generateSortedCombos(n: number, k: number): number[][] {
  // Generate all C(n,k) combos of values [0..n-1], each sorted descending
  // Ordered by lexicographic descending (highest combos first)
  const results: number[][] = [];

  function backtrack(start: number, current: number[]) {
    if (current.length === k) {
      results.push([...current]);
      return;
    }
    for (let i = start; i >= 0; i--) {
      current.push(i);
      backtrack(i - 1, current);
      current.pop();
    }
  }

  backtrack(n - 1, []);
  return results;
}

// Initialize tables on module load
initTables();

// ============================================================
// Core evaluation function
// ============================================================

/**
 * Evaluate exactly 5 cards and return a numeric rank (1=best, 7462=worst).
 */
function evaluate5(cards: Card[]): number {
  const ranks = cards.map(cardRank).sort((a, b) => b - a);
  const suits = cards.map(cardSuit);
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2] && suits[2] === suits[3] && suits[3] === suits[4];
  const uniqueRanks = new Set(ranks).size;

  if (uniqueRanks === 5) {
    // All 5 ranks distinct: straight flush, flush, straight, or high card
    const idx = rankComboIndex(ranks);
    if (isFlush) {
      return FLUSH_TABLE.get(idx)!;
    }
    // Check straight or high card
    const nonFlushRank = NON_FLUSH_TABLE_UNIQUE5.get(idx);
    if (nonFlushRank !== undefined) return nonFlushRank;
    // Should not reach here if tables are built correctly
    throw new Error(`No rank found for unique-5 hand: ${ranks.join(',')}`);
  }

  // Has duplicates: pair, two pair, trips, full house, quads
  const freq = new Map<number, number>();
  for (const r of ranks) freq.set(r, (freq.get(r) || 0) + 1);
  const groups: [number, number][] = [];
  for (const [rank, count] of freq) {
    groups.push([count, rank]);
  }
  const key = encodeFreqs(groups);
  const handRank = NON_UNIQUE_TABLE.get(key);
  if (handRank !== undefined) return handRank;

  throw new Error(`No rank found for hand: ${ranks.join(',')}`);
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
 * Returns a HandRankResult with rank (1=best, 7462=worst), category, and description.
 */
export function evaluateHand(cards: Card[]): HandRankResult {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`evaluateHand expects 5-7 cards, got ${cards.length}`);
  }

  let bestRank = Infinity;

  if (cards.length === 5) {
    bestRank = evaluate5(cards);
  } else {
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
 * Compare two hand rank results. Negative if a is better, positive if b is better, 0 if tied.
 */
export function compareHands(a: HandRankResult, b: HandRankResult): number {
  return a.rank - b.rank;
}

export function handCategoryName(category: HandCategory): string {
  return HAND_CATEGORY_NAMES[category];
}
