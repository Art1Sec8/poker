import { Card, Position, Rank, Suit } from '@/engine/types';
import { makeCard } from '@/engine/card';
import { evaluatePreflopStrength } from '@/engine/preflop';
import { buildRange, RANK_LABELS, rankIdx } from './notation';

// 13x13 Hold'em range grid
// Rows = first rank (A=0..2=12), Cols = second rank (A=0..2=12)
// Upper triangle (row < col): suited combos
// Lower triangle (row > col): offsuit combos
// Diagonal (row === col): pairs
// Value: frequency 0.0-1.0 (how often to play this hand)

export type RangeData = number[][];

export function getRangeLabel(row: number, col: number): string {
  if (row === col) return `${RANK_LABELS[row]}${RANK_LABELS[col]}`;
  if (row < col) return `${RANK_LABELS[row]}${RANK_LABELS[col]}s`;
  return `${RANK_LABELS[col]}${RANK_LABELS[row]}o`;
}

export function isRangeSuited(row: number, col: number): 'suited' | 'offsuit' | 'pair' {
  if (row === col) return 'pair';
  if (row < col) return 'suited';
  return 'offsuit';
}

// ============================================================
// RFI (raise-first-in) ranges — 6-max, 100bb cash.
// Five distinct, position-correct opening ranges authored as
// standard notation, expanded by the verified parser. This is
// the whole point of the feature: position widens the range.
// ============================================================

type RfiSeat = 'UTG' | 'MP' | 'CO' | 'BTN' | 'SB';

const RFI_NOTATION: Record<RfiSeat, { core: string; mixed: string }> = {
  UTG: {
    core: '22+, ATs+, A5s-A4s, KTs+, QTs+, JTs, T9s, 98s, 87s, AJo+, KQo',
    mixed: '22, 33, A5s, A4s, 87s',
  },
  MP: {
    core: '22+, A9s+, A5s-A4s, KTs+, QTs+, J9s+, T9s, 98s, 87s, 76s, ATo+, KJo+',
    mixed: '22, 76s, A5s, A4s',
  },
  CO: {
    core: '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, A9o+, KTo+, QTo+, JTo',
    mixed: '22, 54s, 65s, A9o',
  },
  BTN: {
    // Standard ~50% button open. Lands ~45% after the mixed overlay drops the
    // marginal hands to 0.5 (acceptance band: 40-50%).
    core: '22+, A2s+, K2s+, Q2s+, J4s+, T6s+, 96s+, 85s+, 74s+, 64s+, 53s+, A2o+, K7o+, Q8o+, J8o+, T8o+, 98o, 87o',
    mixed: '22, 54s, 65s, A2o-A5o, K9o, Q9o, J9o, T9o, 98o',
  },
  SB: {
    core: '22+, A2s+, K7s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, A2o+, K9o+, Q9o+, JTo',
    mixed: '22, 54s, 65s, JTo, A2o-A5o',
  },
};

export const RFI_RANGES: Record<RfiSeat, RangeData> = {
  UTG: buildRange(RFI_NOTATION.UTG.core, RFI_NOTATION.UTG.mixed),
  MP: buildRange(RFI_NOTATION.MP.core, RFI_NOTATION.MP.mixed),
  CO: buildRange(RFI_NOTATION.CO.core, RFI_NOTATION.CO.mixed),
  BTN: buildRange(RFI_NOTATION.BTN.core, RFI_NOTATION.BTN.mixed),
  SB: buildRange(RFI_NOTATION.SB.core, RFI_NOTATION.SB.mixed),
};

// BB never opens (raise-first-in) — it only defends. All-zero matrix.
const BB_RANGE: RangeData = Array.from({ length: 13 }, () => Array(13).fill(0));

// Map all 9 Position enum values onto the 5 authored seats.
const POSITION_TO_SEAT: Record<Position, RfiSeat | 'BB'> = {
  UTG: 'UTG',
  UTG1: 'UTG',
  MP: 'MP',
  MP1: 'MP',
  HJ: 'MP',
  CO: 'CO',
  BTN: 'BTN',
  SB: 'SB',
  BB: 'BB',
};

export function getRfiRange(position: Position): RangeData {
  const seat = POSITION_TO_SEAT[position];
  return seat === 'BB' ? BB_RANGE : RFI_RANGES[seat];
}

/**
 * Backward-compatible entry point. Stakes is a no-op cosmetic control for the
 * MVP (the page is honestly labeled "6-max · 100bb cash"); the range is driven
 * entirely by position now.
 */
export function getHoldemRange(_stakes: string, position: Position): RangeData {
  return getRfiRange(position);
}

// Combinations per hand class (out of 1326 total preflop combos).
function combos(row: number, col: number): number {
  const type = isRangeSuited(row, col);
  if (type === 'pair') return 6;
  if (type === 'suited') return 4;
  return 12;
}

/** Percent of all 1326 starting-hand combos that this range opens. */
export function openingPercent(range: RangeData): number {
  let weighted = 0;
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const freq = range[r][c];
      if (freq > 0) weighted += freq * combos(r, c);
    }
  }
  return (weighted / 1326) * 100;
}

// ============================================================
// "Why" engine — keyed to the curriculum's four levers.
// ============================================================

export type Lever = 'equity' | 'position' | 'playability' | 'blocker';
export type Verdict = 'open' | 'mixed' | 'fold';

export interface HandExplanation {
  verdict: Verdict;
  lever: Lever;
  text: string;
}

/** Two representative engine cards for a matrix cell (for strength estimation). */
function repCards(row: number, col: number): Card[] {
  const type = isRangeSuited(row, col);
  const hiIdx = type === 'offsuit' ? col : row;
  const loIdx = type === 'offsuit' ? row : col;
  // Matrix index -> engine rank: A=index0 -> engine rank 12, ... 2=index12 -> 0.
  const r1 = (12 - hiIdx) as Rank;
  const r2 = (12 - loIdx) as Rank;
  if (type === 'pair') return [makeCard(r1, 2 as Suit), makeCard(r1, 3 as Suit)];
  if (type === 'suited') return [makeCard(r1, 2 as Suit), makeCard(r2, 2 as Suit)];
  return [makeCard(r1, 2 as Suit), makeCard(r2, 3 as Suit)];
}

function verdictOf(freq: number): Verdict {
  if (freq >= 0.7) return 'open';
  if (freq >= 0.3) return 'mixed';
  return 'fold';
}

export function explainHand(
  row: number,
  col: number,
  position: Position,
  freq: number
): HandExplanation {
  const label = getRangeLabel(row, col);
  const type = isRangeSuited(row, col);
  const verdict = verdictOf(freq);
  const inHere = freq >= 0.3;

  const utg = getRfiRange('UTG');
  const inUtg = utg[row][col] >= 0.3;

  const hiIdx = type === 'offsuit' ? col : row;
  const loIdx = type === 'offsuit' ? row : col;
  const gap = loIdx - hiIdx; // ranks apart (index distance)

  // (a) Position lever — in range here, but a fold from UTG.
  if (inHere && !inUtg && type !== 'pair') {
    return {
      verdict,
      lever: 'position',
      text: `${label} folds under the gun but opens from ${position}. Same two cards, different answer — that's position. Acting later means fewer players left to wake up with a big hand and more pots you can take down, so your opening range widens seat by seat toward the button.`,
    };
  }

  // (b) Suited connector / one-gapper (gap <= 2, both ranks J or lower).
  if (type === 'suited' && gap >= 1 && gap <= 2 && hiIdx >= 3) {
    return {
      verdict,
      lever: 'playability',
      text: `${label} is a suited connector. It rarely makes top pair, but it flops straights and flushes that win whole stacks — that playability is why it beats higher offsuit hands. 76s plays about as well as KJo despite far less raw high-card equity.`,
    };
  }

  // (c) Suited wheel ace (A-high suited, kicker 5 or lower).
  if (type === 'suited' && hiIdx === 0 && loIdx >= 9) {
    return {
      verdict,
      lever: 'blocker',
      text: `${label} is a suited wheel ace. The ace blocks opponents' AA and AK, it makes the nut flush, and it can make the wheel. That blocker-and-domination edge is why it opens — and even 3-bets as a bluff — despite the weak kicker.`,
    };
  }

  // (d) Offsuit junk that's OUT — domination warning (false-positive copy).
  if (type === 'offsuit' && !inHere) {
    return {
      verdict,
      lever: 'blocker',
      text: `${label} is offsuit with a gap or a weak kicker. It looks playable, but it's dominated: when you flop top pair, a better kicker often has you crushed, and offsuit hands can't make flushes. 72o wins only ~35% even heads-up. Fold it and open suited hands instead.`,
    };
  }

  // (e) Equity lever — relative strength bar.
  const strength = evaluatePreflopStrength(repCards(row, col), 'holdem');
  return {
    verdict,
    lever: 'equity',
    text: `${label} is judged mostly on raw equity here. Its relative strength is about ${(strength * 100).toFixed(0)}% (a rough strength bar, not exact equity). ${
      inHere ? 'Strong enough to open at this seat.' : 'Not strong enough to open profitably from here.'
    }`,
  };
}

export { RANK_LABELS };
