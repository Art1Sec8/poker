import { Position } from '@/engine/types';

// 13x13 Hold'em range grid
// Rows = first rank (A=0..2=12), Cols = second rank (A=0..2=12)
// Upper triangle (row < col): suited combos
// Lower triangle (row > col): offsuit combos
// Diagonal (row === col): pairs
// Value: frequency 0.0-1.0 (how often to play this hand)

const RANK_LABELS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

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

// Tight opening range (micro/low stakes UTG-style)
const TIGHT: number[][] = Array.from({ length: 13 }, () => Array(13).fill(0));

// Premium pairs
[0, 1, 2, 3].forEach(i => { TIGHT[i][i] = 1.0; }); // AA-JJ
TIGHT[4][4] = 0.8; // TT
TIGHT[5][5] = 0.5; // 99
TIGHT[6][6] = 0.3; // 88

// Premium suited
TIGHT[0][1] = 1.0; // AKs
TIGHT[0][2] = 1.0; // AQs
TIGHT[0][3] = 0.8; // AJs
TIGHT[0][4] = 0.5; // ATs
TIGHT[1][2] = 0.8; // KQs
TIGHT[1][3] = 0.5; // KJs

// Premium offsuit
TIGHT[1][0] = 1.0; // AKo
TIGHT[2][0] = 0.8; // AQo
TIGHT[3][0] = 0.3; // AJo

// Loose opening range (BTN/CO style)
const LOOSE: number[][] = Array.from({ length: 13 }, () => Array(13).fill(0));
for (let i = 0; i < 13; i++) {
  for (let j = 0; j < 13; j++) {
    LOOSE[i][j] = TIGHT[i][j];
  }
}
// Add more hands
[5, 6, 7].forEach(i => { LOOSE[i][i] = Math.max(LOOSE[i][i], 0.8); }); // 99-77
[8, 9].forEach(i => { LOOSE[i][i] = 0.5; }); // 66-55
LOOSE[0][5] = 0.8; // A9s-A5s
LOOSE[0][6] = 0.5;
LOOSE[0][7] = 0.3;
LOOSE[1][3] = 1.0; // KJs
LOOSE[1][4] = 0.8; // KTs
LOOSE[2][3] = 0.8; // QJs
LOOSE[2][4] = 0.5; // QTs
LOOSE[3][4] = 0.8; // JTs
LOOSE[4][5] = 0.5; // T9s
LOOSE[5][6] = 0.5; // 98s
LOOSE[3][0] = 0.8; // AJo
LOOSE[4][0] = 0.5; // ATo
LOOSE[2][1] = 0.5; // KQo

export type RangeData = number[][];

const RANGES_BY_POSITION: Record<string, Record<Position, RangeData>> = {
  micro: {
    UTG: TIGHT, UTG1: TIGHT, MP: TIGHT, MP1: TIGHT,
    HJ: TIGHT, CO: LOOSE, BTN: LOOSE, SB: TIGHT, BB: TIGHT,
  },
  low: {
    UTG: TIGHT, UTG1: TIGHT, MP: TIGHT, MP1: TIGHT,
    HJ: LOOSE, CO: LOOSE, BTN: LOOSE, SB: TIGHT, BB: TIGHT,
  },
  mid: {
    UTG: TIGHT, UTG1: TIGHT, MP: LOOSE, MP1: LOOSE,
    HJ: LOOSE, CO: LOOSE, BTN: LOOSE, SB: LOOSE, BB: LOOSE,
  },
  high: {
    UTG: LOOSE, UTG1: LOOSE, MP: LOOSE, MP1: LOOSE,
    HJ: LOOSE, CO: LOOSE, BTN: LOOSE, SB: LOOSE, BB: LOOSE,
  },
};

export function getHoldemRange(stakes: string, position: Position): RangeData {
  return RANGES_BY_POSITION[stakes]?.[position] ?? TIGHT;
}

export { RANK_LABELS };
