import { describe, it, expect } from 'vitest';
import {
  RANKS,
  handAt,
  labelAt,
  regionAt,
  comboCount,
  normalizeHand,
  normalizeRange,
  buildGrid,
} from '../grid';
import { BUILTIN_SCENARIOS } from '../scenarios';

describe('grid notation', () => {
  it('puts pairs on the diagonal', () => {
    expect(handAt(0, 0)).toBe('AA');
    expect(handAt(7, 7)).toBe('77');
    expect(handAt(12, 12)).toBe('22');
    for (let i = 0; i < 13; i++) {
      expect(regionAt(i, i)).toBe('pair');
      expect(handAt(i, i)).toBe(RANKS[i] + RANKS[i]);
    }
  });

  it('puts suited hands in the upper-right triangle (i < j)', () => {
    // AK: A is row 0, K is col 1 -> upper-right -> suited
    expect(handAt(0, 1)).toBe('AKs');
    expect(regionAt(0, 1)).toBe('suited');
    expect(handAt(3, 4)).toBe('JTs');
    expect(handAt(11, 12)).toBe('32s');
  });

  it('puts offsuit hands in the lower-left triangle (i > j)', () => {
    // AKo: K is row 1, A is col 0 -> lower-left -> offsuit
    expect(handAt(1, 0)).toBe('AKo');
    expect(regionAt(1, 0)).toBe('offsuit');
    expect(handAt(9, 0)).toBe('A5o');
  });

  it('AKs is one cell right of the AK diagonal, AKo one cell below it', () => {
    // The "AK" label lives at the intersection of A (idx 0) and K (idx 1).
    expect(labelAt(0, 1)).toBe('AK');
    expect(labelAt(1, 0)).toBe('AK');
    // Upper-right of the diagonal => suited; lower-left => offsuit.
    expect(handAt(0, 1)).toBe('AKs'); // upper triangle
    expect(handAt(1, 0)).toBe('AKo'); // lower triangle
  });

  it('always lists the higher rank first and uses T for ten', () => {
    expect(handAt(4, 8)).toBe('T6s'); // T is idx 4, 6 is idx 8
    expect(handAt(8, 4)).toBe('T6o');
  });

  it('reports combo counts', () => {
    expect(comboCount('AA')).toBe(6);
    expect(comboCount('AKs')).toBe(4);
    expect(comboCount('AKo')).toBe(12);
  });

  it('builds a 13x13 grid of 169 distinct hands', () => {
    const grid = buildGrid();
    expect(grid).toHaveLength(13);
    const all = grid.flat();
    expect(all).toHaveLength(169);
    expect(new Set(all).size).toBe(169);
  });
});

describe('normalizeHand', () => {
  it('canonicalizes ordering, case, and ten', () => {
    expect(normalizeHand('kas')).toBe('AKs');
    expect(normalizeHand('ak')).toBe(null); // non-pair needs a suffix
    expect(normalizeHand('AKo')).toBe('AKo');
    expect(normalizeHand('10 9 s')).toBe('T9s');
    expect(normalizeHand('9Ts')).toBe('T9s');
    expect(normalizeHand('5As')).toBe('A5s');
  });

  it('handles pairs and rejects suited pairs', () => {
    expect(normalizeHand('aa')).toBe('AA');
    expect(normalizeHand('AAo')).toBe('AA'); // lenient: pairs have no suit
    expect(normalizeHand('AAs')).toBe(null); // a pair cannot be suited
    expect(normalizeHand('TT')).toBe('TT');
  });

  it('rejects garbage', () => {
    expect(normalizeHand('')).toBe(null);
    expect(normalizeHand('XYz')).toBe(null);
    expect(normalizeHand('AKx')).toBe(null);
    expect(normalizeHand('A')).toBe(null);
    expect(normalizeHand(42 as unknown as string)).toBe(null);
  });

  it('normalizeRange drops invalid and de-duplicates', () => {
    expect(normalizeRange(['AKs', 'kas', 'junk', 'AA', 'AAo'])).toEqual(['AKs', 'AA']);
  });
});

describe('built-in scenarios', () => {
  it('every reference hand is already canonical', () => {
    for (const s of BUILTIN_SCENARIOS) {
      expect(s.referenceRange.length).toBeGreaterThan(0);
      for (const h of s.referenceRange) {
        expect(normalizeHand(h)).toBe(h);
      }
      // no duplicates
      expect(new Set(s.referenceRange).size).toBe(s.referenceRange.length);
    }
  });

  it('preflop scenarios have no board, flop scenarios have three cards', () => {
    for (const s of BUILTIN_SCENARIOS) {
      if (s.street === 'preflop') {
        expect(s.board).toBeNull();
      } else {
        expect(s.board).toMatch(/^\S\S \S\S \S\S$/);
      }
    }
  });
});
