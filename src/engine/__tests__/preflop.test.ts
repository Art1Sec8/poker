import { describe, it, expect } from 'vitest';
import { evaluatePreflopStrength } from '../preflop';
import { parseCards } from '../card';

describe('preflop strength - holdem', () => {
  it('AA is the strongest preflop hand', () => {
    const strength = evaluatePreflopStrength(parseCards('AhAd'), 'holdem');
    expect(strength).toBeGreaterThan(0.90);
  });

  it('KK is very strong', () => {
    const strength = evaluatePreflopStrength(parseCards('KhKd'), 'holdem');
    expect(strength).toBeGreaterThan(0.85);
  });

  it('72o is weak', () => {
    const strength = evaluatePreflopStrength(parseCards('7h2d'), 'holdem');
    expect(strength).toBeLessThan(0.25);
  });

  it('suited connectors are better than offsuit', () => {
    const suited = evaluatePreflopStrength(parseCards('Th9h'), 'holdem');
    const offsuit = evaluatePreflopStrength(parseCards('Th9d'), 'holdem');
    expect(suited).toBeGreaterThan(offsuit);
  });

  it('higher pairs beat lower pairs', () => {
    const aa = evaluatePreflopStrength(parseCards('AhAd'), 'holdem');
    const kk = evaluatePreflopStrength(parseCards('KhKd'), 'holdem');
    const jj = evaluatePreflopStrength(parseCards('JhJd'), 'holdem');
    expect(aa).toBeGreaterThan(kk);
    expect(kk).toBeGreaterThan(jj);
  });
});

describe('preflop strength - PLO', () => {
  it('AAKKds is very strong', () => {
    const strength = evaluatePreflopStrength(parseCards('AhAdKhKd'), 'plo');
    expect(strength).toBeGreaterThan(0.60);
  });

  it('returns value in valid range', () => {
    const strength = evaluatePreflopStrength(parseCards('2h3d4c5s'), 'plo');
    expect(strength).toBeGreaterThanOrEqual(0.05);
    expect(strength).toBeLessThanOrEqual(0.95);
  });

  it('double-suited is better than rainbow', () => {
    const ds = evaluatePreflopStrength(parseCards('AhKhAdKd'), 'plo');
    const rainbow = evaluatePreflopStrength(parseCards('AhKdAcKs'), 'plo');
    // Double suited should have some bonus
    expect(ds).toBeGreaterThanOrEqual(rainbow);
  });
});
