// ============================================================
// Poker Engine Type Definitions
// ============================================================

/** Card rank: 2=0, 3=1, ..., A=12 */
export type Rank = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Suit: clubs=0, diamonds=1, hearts=2, spades=3 */
export type Suit = 0 | 1 | 2 | 3;

/** Card encoded as integer 0-51: rank * 4 + suit */
export type Card = number;

export type GameVariant = 'holdem' | 'plo';
export type StakesLevel = 'micro' | 'low' | 'mid' | 'high';
export type Position = 'UTG' | 'UTG1' | 'MP' | 'MP1' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface ActionRecord {
  playerId: number;
  type: ActionType;
  amount: number;
  street: Street;
  timestamp: number;
}

export interface PlayerState {
  id: number;
  name: string;
  chips: number;
  holeCards: Card[];
  position: Position;
  isActive: boolean;       // still in the hand
  isSittingOut: boolean;   // not playing this round
  currentBet: number;      // amount bet this street
  totalBetThisHand: number;
  isHuman: boolean;
  aiDifficulty?: 'fish' | 'regular' | 'shark';
}

export interface GameState {
  variant: GameVariant;
  street: Street;
  board: Card[];
  pot: number;
  sidePots: SidePot[];
  players: PlayerState[];
  currentPlayerIndex: number;
  dealerIndex: number;
  deck: Card[];
  actionHistory: ActionRecord[];
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  handNumber: number;
  isHandComplete: boolean;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: number[];
}

export interface HandRankResult {
  rank: number;           // 1 (royal flush) to 7462 (worst high card)
  category: HandCategory;
  description: string;    // e.g., "Pair of Aces, King kicker"
}

export type HandCategory =
  | 'royal-flush'
  | 'straight-flush'
  | 'four-of-a-kind'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'three-of-a-kind'
  | 'two-pair'
  | 'one-pair'
  | 'high-card';

export interface EquityResult {
  equities: number[];     // one per hand, 0.0-1.0
  wins: number[];
  ties: number[];
  samples: number;
  isComplete: boolean;
}

export interface RoomConfig {
  id: string;
  variant: GameVariant;
  smallBlind: number;
  bigBlind: number;
  buyIn: number;
  maxPlayers: number;
  aiSeats: AISeatConfig[];
}

export interface AISeatConfig {
  difficulty: 'fish' | 'regular' | 'shark' | 'random';
}

/** 13x13 matrix: rows/cols = ranks (A=0..2=12), upper tri = suited, lower = offsuit, diag = pairs */
export type HoldemRange = number[][];

export interface PloHandCategory {
  name: string;
  description: string;
  examples: string[];
  frequency: number;       // 0.0-1.0 open frequency
  matchFn: (cards: Card[]) => boolean;
}

export type PloRange = PloHandCategory[];

export interface CoachAnalysis {
  recommendedAction: ActionType;
  recommendedAmount?: number;
  equity: number;
  reasoning: string;
  decisionQuality?: 'brilliant' | 'solid' | 'mistake';
}

export interface ValidAction {
  type: ActionType;
  minAmount: number;
  maxAmount: number;
}
