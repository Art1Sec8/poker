import { Card, GameVariant } from './types';
import { cardRank, cardSuit } from './card';

/**
 * Estimate preflop hand strength on a 0-1 scale.
 * Used by AI players for preflop decision-making.
 *
 * Hold'em: considers pair, suitedness, connectivity, high card value.
 * PLO: considers double-suitedness, rundown quality, pair strength, connectivity.
 */
export function evaluatePreflopStrength(cards: Card[], variant: GameVariant): number {
  if (variant === 'plo') {
    return evaluatePloPreflopStrength(cards);
  }
  return evaluateHoldemPreflopStrength(cards);
}

function evaluateHoldemPreflopStrength(cards: Card[]): number {
  const r1 = cardRank(cards[0]);
  const r2 = cardRank(cards[1]);
  const suited = cardSuit(cards[0]) === cardSuit(cards[1]);
  const high = Math.max(r1, r2);
  const low = Math.min(r1, r2);
  const gap = high - low;
  const isPair = r1 === r2;

  if (isPair) {
    // Pairs: 22=0.50, ..., AA=0.95
    return 0.50 + (high / 12) * 0.45;
  }

  let strength = 0;
  // High card contribution
  strength += (high / 12) * 0.30;
  // Low card contribution
  strength += (low / 12) * 0.15;
  // Suitedness bonus
  if (suited) strength += 0.06;
  // Connectivity bonus
  if (gap === 1) strength += 0.05;
  else if (gap === 2) strength += 0.03;
  else if (gap === 3) strength += 0.01;

  return Math.min(0.95, Math.max(0, strength));
}

function evaluatePloPreflopStrength(cards: Card[]): number {
  if (cards.length !== 4) return 0.25;

  const ranks = cards.map(cardRank).sort((a, b) => b - a);
  const suits = cards.map(cardSuit);

  let strength = 0;

  // High card value
  strength += (ranks[0] / 12) * 0.15;
  strength += (ranks[1] / 12) * 0.10;

  // Pair detection
  const rankCounts = new Map<number, number>();
  for (const r of ranks) rankCounts.set(r, (rankCounts.get(r) || 0) + 1);
  const pairs = [...rankCounts.entries()].filter(([, c]) => c >= 2);

  if (pairs.length > 0) {
    const bestPairRank = Math.max(...pairs.map(([r]) => r));
    strength += 0.10 + (bestPairRank / 12) * 0.15;
    // Double paired
    if (pairs.length >= 2) strength += 0.05;
    // Trips/quads are actually bad in PLO (reduces combos)
    if (pairs.some(([, c]) => c >= 3)) strength -= 0.10;
  }

  // Suitedness
  const suitCounts = new Map<number, number>();
  for (const s of suits) suitCounts.set(s, (suitCounts.get(s) || 0) + 1);
  const suitedCount = Math.max(...suitCounts.values());
  if (suitedCount === 2) {
    // Single suited
    const suitedSuit = [...suitCounts.entries()].find(([, c]) => c === 2)?.[0];
    if (suitedSuit !== undefined) {
      const suitedRanks = cards.filter(c => cardSuit(c) === suitedSuit).map(cardRank);
      // Suited with high card is better
      strength += 0.04 + (Math.max(...suitedRanks) / 12) * 0.04;
    }
  }
  // Check for double-suited (two suits each appearing twice)
  const doubleSuited = [...suitCounts.values()].filter(c => c === 2).length === 2;
  if (doubleSuited) strength += 0.08;

  // Connectivity (rundown quality)
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  if (uniqueRanks.length >= 3) {
    let gaps = 0;
    for (let i = 0; i < uniqueRanks.length - 1; i++) {
      gaps += uniqueRanks[i] - uniqueRanks[i + 1] - 1;
    }
    // Fewer gaps = better rundown
    const maxGaps = uniqueRanks.length - 1;
    const connectedness = 1 - (gaps / (maxGaps * 4));
    strength += connectedness * 0.10;
  }

  return Math.min(0.95, Math.max(0.05, strength));
}
