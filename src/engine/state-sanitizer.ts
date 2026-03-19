import { GameState } from './types';

/**
 * Strip other players' hole cards so a client can only see their own hand.
 * At showdown (isHandComplete), all active players' cards are revealed.
 */
export function sanitizeForPlayer(state: GameState, playerId: number): GameState {
  return {
    ...state,
    deck: [], // never send deck to client
    players: state.players.map(p => {
      if (p.id === playerId) return p;
      if (state.isHandComplete && p.isActive) return p; // showdown reveal
      return { ...p, holeCards: [] };
    }),
  };
}

/**
 * Strip all hole cards and deck for spectators.
 * At showdown, active players' cards are revealed.
 */
export function sanitizeForSpectator(state: GameState): GameState {
  return {
    ...state,
    deck: [],
    players: state.players.map(p => {
      if (state.isHandComplete && p.isActive) return p;
      return { ...p, holeCards: [] };
    }),
  };
}
