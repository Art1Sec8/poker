import { describe, it, expect } from 'vitest';
import {
  createNewHand, advanceStreet, isStreetComplete, isHandOver,
  resolveShowdown, getNextPlayerIndex, calculateSidePots,
} from '../game-state';
import { PlayerState } from '../types';

function basePlayers(n: number): Omit<PlayerState, 'holeCards' | 'currentBet' | 'totalBetThisHand' | 'isActive' | 'position'>[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i, name: `P${i}`, chips: 1000, isSittingOut: false, isHuman: true,
  }));
}

describe('createNewHand', () => {
  it('creates a valid 6-player Hold\'em hand', () => {
    const state = createNewHand(basePlayers(6), 'holdem', 5, 10, 0, 1);
    expect(state.players).toHaveLength(6);
    expect(state.street).toBe('preflop');
    expect(state.board).toHaveLength(0);
    // Each player has 2 cards
    state.players.forEach(p => expect(p.holeCards).toHaveLength(2));
    // Blinds posted
    expect(state.pot).toBe(15); // 5 + 10
    // Deck has 52 - 12 = 40 cards remaining
    expect(state.deck).toHaveLength(40);
  });

  it('creates a valid 6-player PLO hand', () => {
    const state = createNewHand(basePlayers(6), 'plo', 5, 10, 0, 1);
    state.players.forEach(p => expect(p.holeCards).toHaveLength(4));
    expect(state.deck).toHaveLength(52 - 24); // 6*4 = 24 cards dealt
  });

  it('handles 2-player heads-up correctly', () => {
    const state = createNewHand(basePlayers(2), 'holdem', 5, 10, 0, 1);
    expect(state.players).toHaveLength(2);
    // Dealer (index 0) posts SB
    expect(state.players[0].position).toBe('SB');
    expect(state.players[0].currentBet).toBe(5);
    // Other player posts BB
    expect(state.players[1].position).toBe('BB');
    expect(state.players[1].currentBet).toBe(10);
    // Preflop: dealer/SB acts first
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('assigns positions correctly for 3 players', () => {
    const state = createNewHand(basePlayers(3), 'holdem', 5, 10, 0, 1);
    expect(state.players[0].position).toBe('BTN');
    expect(state.players[1].position).toBe('SB');
    expect(state.players[2].position).toBe('BB');
  });

  it('throws for invalid player count', () => {
    expect(() => createNewHand(basePlayers(1), 'holdem', 5, 10, 0, 1)).toThrow();
    expect(() => createNewHand(basePlayers(10), 'holdem', 5, 10, 0, 1)).toThrow();
  });
});

describe('advanceStreet', () => {
  it('deals 3 cards on flop', () => {
    const state = createNewHand(basePlayers(3), 'holdem', 5, 10, 0, 1);
    const flop = advanceStreet(state);
    expect(flop.street).toBe('flop');
    expect(flop.board).toHaveLength(3);
  });

  it('deals 1 card on turn', () => {
    let state = createNewHand(basePlayers(3), 'holdem', 5, 10, 0, 1);
    state = advanceStreet(state); // flop
    const turn = advanceStreet(state);
    expect(turn.street).toBe('turn');
    expect(turn.board).toHaveLength(4);
  });

  it('deals 1 card on river', () => {
    let state = createNewHand(basePlayers(3), 'holdem', 5, 10, 0, 1);
    state = advanceStreet(state); // flop
    state = advanceStreet(state); // turn
    const river = advanceStreet(state);
    expect(river.street).toBe('river');
    expect(river.board).toHaveLength(5);
  });

  it('resets current bets on new street', () => {
    const state = createNewHand(basePlayers(3), 'holdem', 5, 10, 0, 1);
    const flop = advanceStreet(state);
    flop.players.forEach(p => expect(p.currentBet).toBe(0));
  });
});

describe('isStreetComplete', () => {
  it('returns true when only one player active', () => {
    const state = createNewHand(basePlayers(2), 'holdem', 5, 10, 0, 1);
    state.players[0].isActive = false;
    expect(isStreetComplete(state)).toBe(true);
  });

  it('returns false when player hasn\'t acted', () => {
    const state = createNewHand(basePlayers(3), 'holdem', 5, 10, 0, 1);
    // No actions taken yet
    expect(isStreetComplete(state)).toBe(false);
  });

  it('BB option: BB gets to act even when all limped', () => {
    const state = createNewHand(basePlayers(3), 'holdem', 5, 10, 0, 1);
    // UTG calls (matches BB)
    state.players[0].currentBet = 10;
    state.players[0].chips = 990;
    // SB completes (matches BB)
    state.players[1].currentBet = 10;
    state.players[1].chips = 990;
    // BB hasn't acted (already at 10 from posting)
    // All bets equal, but BB hasn't voluntarily acted
    state.actionHistory = [
      { playerId: 0, type: 'call', amount: 10, street: 'preflop', timestamp: 1 },
      { playerId: 1, type: 'call', amount: 5, street: 'preflop', timestamp: 2 },
    ];
    expect(isStreetComplete(state)).toBe(false); // BB hasn't acted
  });
});

describe('calculateSidePots', () => {
  it('creates side pots for all-in with different stacks', () => {
    // Player 0: all-in for 50
    // Player 1: all-in for 100
    // Player 2: calls 100
    const players: PlayerState[] = [
      { id: 0, name: 'P0', chips: 0, holeCards: [], position: 'BTN', isActive: true, isSittingOut: false, currentBet: 50, totalBetThisHand: 50, isHuman: true },
      { id: 1, name: 'P1', chips: 0, holeCards: [], position: 'SB', isActive: true, isSittingOut: false, currentBet: 100, totalBetThisHand: 100, isHuman: true },
      { id: 2, name: 'P2', chips: 900, holeCards: [], position: 'BB', isActive: true, isSittingOut: false, currentBet: 100, totalBetThisHand: 100, isHuman: true },
    ];

    const pots = calculateSidePots(players);
    expect(pots).toHaveLength(2);

    // Main pot: 50 * 3 = 150, all 3 eligible
    expect(pots[0].amount).toBe(150);
    expect(pots[0].eligiblePlayerIds).toHaveLength(3);

    // Side pot: 50 * 2 = 100, only P1 and P2
    expect(pots[1].amount).toBe(100);
    expect(pots[1].eligiblePlayerIds).toHaveLength(2);
    expect(pots[1].eligiblePlayerIds).not.toContain(0);
  });

  it('handles all players at same level (no side pot)', () => {
    const players: PlayerState[] = [
      { id: 0, name: 'P0', chips: 0, holeCards: [], position: 'BTN', isActive: true, isSittingOut: false, currentBet: 100, totalBetThisHand: 100, isHuman: true },
      { id: 1, name: 'P1', chips: 0, holeCards: [], position: 'SB', isActive: true, isSittingOut: false, currentBet: 100, totalBetThisHand: 100, isHuman: true },
    ];

    const pots = calculateSidePots(players);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(200);
  });
});

describe('resolveShowdown', () => {
  it('awards pot to last player standing', () => {
    const state = createNewHand(basePlayers(2), 'holdem', 5, 10, 0, 1);
    state.players[1].isActive = false;
    const resolved = resolveShowdown(state);
    expect(resolved.isHandComplete).toBe(true);
    expect(resolved.pot).toBe(0);
    expect(resolved.players[0].chips).toBeGreaterThan(990); // got the pot
  });
});

describe('isHandOver', () => {
  it('returns true when 1 player active', () => {
    const state = createNewHand(basePlayers(3), 'holdem', 5, 10, 0, 1);
    state.players[0].isActive = false;
    state.players[1].isActive = false;
    expect(isHandOver(state)).toBe(true);
  });

  it('returns false when 2+ players active', () => {
    const state = createNewHand(basePlayers(3), 'holdem', 5, 10, 0, 1);
    expect(isHandOver(state)).toBe(false);
  });
});

describe('getNextPlayerIndex', () => {
  it('finds next active player', () => {
    const state = createNewHand(basePlayers(3), 'holdem', 5, 10, 0, 1);
    state.currentPlayerIndex = 0;
    state.players[1].isActive = false;
    expect(getNextPlayerIndex(state)).toBe(2);
  });
});
