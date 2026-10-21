import { describe, it, expect } from 'vitest';
import { parseRangeNotation, buildRange } from '../notation';
import { getRangeLabel } from '../ranges';
import { RFI_RANGES, openingPercent } from '../ranges';

/** Collect the labels of every cell with freq >= threshold. */
function labelsOf(m: number[][], threshold = 0.3): Set<string> {
  const out = new Set<string>();
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      if (m[r][c] >= threshold) out.add(getRangeLabel(r, c));
    }
  }
  return out;
}

describe('parseRangeNotation - suited/offsuit expansion', () => {
  it('ATs+ -> AKs, AQs, AJs, ATs', () => {
    expect(labelsOf(parseRangeNotation('ATs+'))).toEqual(
      new Set(['AKs', 'AQs', 'AJs', 'ATs'])
    );
  });

  it('K5s+ -> 8 cells (KQs..K5s)', () => {
    const set = labelsOf(parseRangeNotation('K5s+'));
    expect(set.size).toBe(8);
    expect(set).toEqual(
      new Set(['KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s'])
    );
  });

  it('97s+ -> 98s, 97s', () => {
    expect(labelsOf(parseRangeNotation('97s+'))).toEqual(new Set(['98s', '97s']));
  });

  it('A5s-A4s -> 2 cells', () => {
    expect(labelsOf(parseRangeNotation('A5s-A4s'))).toEqual(new Set(['A5s', 'A4s']));
  });

  it('K9o+ -> KQo, KJo, KTo, K9o', () => {
    expect(labelsOf(parseRangeNotation('K9o+'))).toEqual(
      new Set(['KQo', 'KJo', 'KTo', 'K9o'])
    );
  });

  it('T9o single -> just T9o', () => {
    expect(labelsOf(parseRangeNotation('T9o'))).toEqual(new Set(['T9o']));
  });
});

describe('parseRangeNotation - pairs', () => {
  it('22+ -> all 13 pairs', () => {
    const set = labelsOf(parseRangeNotation('22+'));
    expect(set.size).toBe(13);
    expect(set.has('AA')).toBe(true);
    expect(set.has('22')).toBe(true);
  });

  it('TT-77 -> TT, 99, 88, 77', () => {
    expect(labelsOf(parseRangeNotation('TT-77'))).toEqual(
      new Set(['TT', '99', '88', '77'])
    );
  });
});

describe('buildRange - mixed overlay', () => {
  it('lowers mixed cells to 0.5 and keeps core at 1.0', () => {
    const m = buildRange('22+, ATs+', '22');
    // 22 is a pair on the diagonal at index 12.
    expect(m[12][12]).toBe(0.5);
    // AA stays at full frequency.
    expect(m[0][0]).toBe(1.0);
  });
});

describe('openingPercent - position widening', () => {
  it('UTG is within 12-20%', () => {
    const pct = openingPercent(RFI_RANGES.UTG);
    expect(pct).toBeGreaterThanOrEqual(12);
    expect(pct).toBeLessThanOrEqual(20);
  });

  it('CO is within 23-31%', () => {
    const pct = openingPercent(RFI_RANGES.CO);
    expect(pct).toBeGreaterThanOrEqual(23);
    expect(pct).toBeLessThanOrEqual(31);
  });

  it('BTN is within 40-50%', () => {
    const pct = openingPercent(RFI_RANGES.BTN);
    expect(pct).toBeGreaterThanOrEqual(40);
    expect(pct).toBeLessThanOrEqual(50);
  });

  it('opening % increases monotonically UTG <= MP <= CO <= BTN', () => {
    const utg = openingPercent(RFI_RANGES.UTG);
    const mp = openingPercent(RFI_RANGES.MP);
    const co = openingPercent(RFI_RANGES.CO);
    const btn = openingPercent(RFI_RANGES.BTN);
    expect(utg).toBeLessThanOrEqual(mp);
    expect(mp).toBeLessThanOrEqual(co);
    expect(co).toBeLessThanOrEqual(btn);
  });
});

describe('range containment', () => {
  it('the UTG in-range set is a strict subset of the BTN in-range set', () => {
    const utg = labelsOf(RFI_RANGES.UTG);
    const btn = labelsOf(RFI_RANGES.BTN);
    for (const hand of utg) {
      expect(btn.has(hand)).toBe(true);
    }
    expect(btn.size).toBeGreaterThan(utg.size);
  });
});
