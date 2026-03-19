import { describe, it, expect } from 'vitest';
import { calculateEquity } from '../equity-calculator';
import { parseCards } from '../card';

describe('equity calculator', () => {
  it('AA vs KK preflop is approximately 81% (±3%)', () => {
    const aa = parseCards('AhAd');
    const kk = parseCards('KhKd');
    const result = calculateEquity([aa, kk], [], 'holdem', 5000);
    expect(result.equities[0]).toBeGreaterThan(0.78);
    expect(result.equities[0]).toBeLessThan(0.84);
  });

  it('AKs vs QQ preflop is approximately 46% (±4%)', () => {
    const aks = parseCards('AhKh');
    const qq = parseCards('QdQc');
    const result = calculateEquity([aks, qq], [], 'holdem', 5000);
    expect(result.equities[0]).toBeGreaterThan(0.42);
    expect(result.equities[0]).toBeLessThan(0.50);
  });

  it('equities sum to approximately 1.0', () => {
    const hand1 = parseCards('AhKd');
    const hand2 = parseCards('QhQd');
    const result = calculateEquity([hand1, hand2], [], 'holdem', 5000);
    const sum = result.equities.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0.98);
    expect(sum).toBeLessThan(1.02);
  });

  it('winning hand on complete board has 100% equity', () => {
    // AA vs KK on board with an ace (no straight possible for KK)
    const aa = parseCards('AhAd');
    const kk = parseCards('KhKd');
    const board = parseCards('Ac9s7c3s2c'); // AA has trips, KK has pair
    const result = calculateEquity([aa, kk], board, 'holdem', 100);
    expect(result.equities[0]).toBe(1);
    expect(result.equities[1]).toBe(0);
  });

  it('throws on empty hands', () => {
    expect(() => calculateEquity([], [], 'holdem')).toThrow('At least one hand');
  });

  it('throws on duplicate cards', () => {
    const hand1 = parseCards('AhKd');
    const hand2 = parseCards('AhQd'); // Ah is duplicate
    expect(() => calculateEquity([hand1, hand2], [], 'holdem')).toThrow('Duplicate');
  });

  it('throws on 0 iterations', () => {
    const hand1 = parseCards('AhKd');
    expect(() => calculateEquity([hand1], [], 'holdem', 0)).toThrow('positive');
  });

  it('works with PLO hands', () => {
    const hand1 = parseCards('AhAdKhKd');
    const hand2 = parseCards('QhQdJhJd');
    const result = calculateEquity([hand1, hand2], [], 'plo', 2000);
    // AAKKds is a strong PLO hand, should have >55% equity
    expect(result.equities[0]).toBeGreaterThan(0.50);
    expect(result.samples).toBe(2000);
  });
});
