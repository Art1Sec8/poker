import { describe, it, expect } from 'vitest';
import { validateCards, validateHoleCards, validateBoard, validateAction } from '../validation';
import { GameState, PlayerState } from '../types';

describe('validateCards', () => {
  it('accepts valid cards', () => {
    expect(() => validateCards([0, 1, 2, 3, 4])).not.toThrow();
  });

  it('rejects out-of-range cards', () => {
    expect(() => validateCards([52])).toThrow('Invalid card');
    expect(() => validateCards([-1])).toThrow('Invalid card');
    expect(() => validateCards([999])).toThrow('Invalid card');
  });

  it('rejects non-integer cards', () => {
    expect(() => validateCards([1.5])).toThrow('Invalid card');
  });

  it('rejects duplicate cards', () => {
    expect(() => validateCards([0, 1, 0])).toThrow('Duplicate card');
  });

  it('accepts empty array', () => {
    expect(() => validateCards([])).not.toThrow();
  });
});

describe('validateHoleCards', () => {
  it('accepts 2 cards for holdem', () => {
    expect(() => validateHoleCards([0, 1], 'holdem')).not.toThrow();
  });

  it('rejects wrong count for holdem', () => {
    expect(() => validateHoleCards([0, 1, 2], 'holdem')).toThrow('2 hole cards');
  });

  it('accepts 4 cards for PLO', () => {
    expect(() => validateHoleCards([0, 1, 2, 3], 'plo')).not.toThrow();
  });

  it('rejects wrong count for PLO', () => {
    expect(() => validateHoleCards([0, 1], 'plo')).toThrow('4 hole cards');
  });
});

describe('validateBoard', () => {
  it('accepts 0-5 board cards', () => {
    expect(() => validateBoard([])).not.toThrow();
    expect(() => validateBoard([0, 1, 2])).not.toThrow();
    expect(() => validateBoard([0, 1, 2, 3, 4])).not.toThrow();
  });

  it('rejects more than 5 board cards', () => {
    expect(() => validateBoard([0, 1, 2, 3, 4, 5])).toThrow('more than 5');
  });

  it('rejects overlap with hole cards', () => {
    expect(() => validateBoard([0, 1, 2], [0, 5])).toThrow('also a hole card');
  });
});
