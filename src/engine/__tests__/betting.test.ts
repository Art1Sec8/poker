import { describe, it, expect } from 'vitest';
import { getValidActions, getAmountToCall, calculatePotLimit, applyAction } from '../betting';
import { GameState, PlayerState } from '../types';

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 0, name: 'P0', chips: 1000, holeCards: [], position: 'BTN',
    isActive: true, isSittingOut: false, currentBet: 0, totalBetThisHand: 0,
    isHuman: true, ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    variant: 'holdem', street: 'flop', board: [], pot: 0, sidePots: [],
    players: [makePlayer({ id: 0 }), makePlayer({ id: 1 })],
    currentPlayerIndex: 0, dealerIndex: 0, deck: [], actionHistory: [],
    smallBlind: 5, bigBlind: 10, minRaise: 10, handNumber: 1, isHandComplete: false,
    ...overrides,
  };
}

describe('getAmountToCall', () => {
  it('returns 0 when no bet to face', () => {
    const state = makeState();
    expect(getAmountToCall(state)).toBe(0);
  });

  it('returns difference between max bet and player bet', () => {
    const state = makeState({
      players: [
        makePlayer({ id: 0, currentBet: 0 }),
        makePlayer({ id: 1, currentBet: 50 }),
      ],
    });
    expect(getAmountToCall(state)).toBe(50);
  });
});

describe('getValidActions', () => {
  it('offers check and bet when no bet to face', () => {
    const state = makeState();
    const actions = getValidActions(state);
    const types = actions.map(a => a.type);
    expect(types).toContain('check');
    expect(types).toContain('bet');
    expect(types).not.toContain('fold');
    expect(types).not.toContain('call');
  });

  it('offers fold, call, raise when facing a bet', () => {
    const state = makeState({
      players: [
        makePlayer({ id: 0, currentBet: 0 }),
        makePlayer({ id: 1, currentBet: 50 }),
      ],
      pot: 50,
    });
    const actions = getValidActions(state);
    const types = actions.map(a => a.type);
    expect(types).toContain('fold');
    expect(types).toContain('call');
    expect(types).toContain('raise');
  });

  it('offers all-in when chips less than call amount', () => {
    const state = makeState({
      players: [
        makePlayer({ id: 0, chips: 30, currentBet: 0 }),
        makePlayer({ id: 1, currentBet: 50 }),
      ],
      pot: 50,
    });
    const actions = getValidActions(state);
    const types = actions.map(a => a.type);
    expect(types).toContain('allin');
    expect(types).toContain('fold');
  });

  it('min bet is big blind', () => {
    const state = makeState({ bigBlind: 10 });
    const actions = getValidActions(state);
    const bet = actions.find(a => a.type === 'bet');
    expect(bet?.minAmount).toBe(10);
  });
});

describe('calculatePotLimit', () => {
  it('calculates correct pot-limit max for PLO', () => {
    // Pot: $100, opponent bet $50 this street, we haven't bet yet
    // Call amount: $50
    // Pot after call: $100 + $50(opp) + $50(our call) = $200
    // Max raise: $50(call) + $200(pot after call) = $250
    const state = makeState({
      variant: 'plo',
      pot: 100,
      players: [
        makePlayer({ id: 0, currentBet: 0 }),
        makePlayer({ id: 1, currentBet: 50 }),
      ],
    });
    const result = calculatePotLimit(state);
    expect(result).toBe(250);
  });

  it('handles no current bets (opening bet)', () => {
    // Pot: $15 (blinds), no bets this street
    // Call: $0, pot after call: $15+0+0 = $15
    // Max bet: $0 + $15 = $15
    const state = makeState({
      variant: 'plo',
      pot: 15,
      players: [
        makePlayer({ id: 0, currentBet: 0 }),
        makePlayer({ id: 1, currentBet: 0 }),
      ],
    });
    const result = calculatePotLimit(state);
    expect(result).toBe(15);
  });
});

describe('applyAction', () => {
  it('applies fold correctly', () => {
    const state = makeState({
      pot: 50,
      players: [
        makePlayer({ id: 0, currentBet: 0 }),
        makePlayer({ id: 1, currentBet: 50 }),
      ],
    });
    const newState = applyAction(state, {
      playerId: 0, type: 'fold', amount: 0, street: 'flop', timestamp: 0,
    });
    expect(newState.players[0].isActive).toBe(false);
    expect(newState.pot).toBe(50); // unchanged
  });

  it('applies call correctly', () => {
    const state = makeState({
      pot: 50,
      players: [
        makePlayer({ id: 0, chips: 1000, currentBet: 0 }),
        makePlayer({ id: 1, currentBet: 50 }),
      ],
    });
    const newState = applyAction(state, {
      playerId: 0, type: 'call', amount: 50, street: 'flop', timestamp: 0,
    });
    expect(newState.players[0].chips).toBe(950);
    expect(newState.players[0].currentBet).toBe(50);
    expect(newState.pot).toBe(100);
  });

  it('rejects invalid action', () => {
    const state = makeState(); // no bet to face
    expect(() => applyAction(state, {
      playerId: 0, type: 'fold', amount: 0, street: 'flop', timestamp: 0,
    })).toThrow(); // can't fold when there's no bet
  });

  it('rejects out-of-range bet', () => {
    const state = makeState({ bigBlind: 10 });
    expect(() => applyAction(state, {
      playerId: 0, type: 'bet', amount: 5, street: 'flop', timestamp: 0,
    })).toThrow(); // below min bet
  });
});
