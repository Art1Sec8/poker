import { ActionType, GameVariant, Position, Street } from '@/engine/types';

export interface QuizScenario {
  variant: GameVariant;
  holeCards: string; // e.g. "AhKh"
  board: string;     // e.g. "Qh9h2c"
  position: Position;
  street: Street;
  pot: number;
  toCall: number;
  correctAction: ActionType;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const QUIZ_SCENARIOS: QuizScenario[] = [
  // Easy — clear decisions
  {
    variant: 'holdem', holeCards: 'AhAs', board: '', position: 'UTG', street: 'preflop',
    pot: 15, toCall: 0, correctAction: 'raise', difficulty: 'easy',
    explanation: 'Pocket aces is the best starting hand. Always raise preflop from any position.',
  },
  {
    variant: 'holdem', holeCards: '7h2d', board: '', position: 'UTG', street: 'preflop',
    pot: 15, toCall: 10, correctAction: 'fold', difficulty: 'easy',
    explanation: '72 offsuit is the worst starting hand. Fold from any position facing a raise.',
  },
  {
    variant: 'holdem', holeCards: 'AhKh', board: 'QhJhTh', position: 'BTN', street: 'flop',
    pot: 60, toCall: 0, correctAction: 'bet', difficulty: 'easy',
    explanation: 'You flopped a royal flush! Bet for value — this is the best possible hand.',
  },
  {
    variant: 'holdem', holeCards: 'KhKd', board: 'AhAd7c', position: 'BB', street: 'flop',
    pot: 40, toCall: 30, correctAction: 'fold', difficulty: 'easy',
    explanation: 'Two aces on the board means any Ax hand beats you. Your kings are likely second best. Fold to a big bet.',
  },
  // Medium — requires thought
  {
    variant: 'holdem', holeCards: 'AhKd', board: 'Qh9h2c', position: 'CO', street: 'flop',
    pot: 30, toCall: 20, correctAction: 'call', difficulty: 'medium',
    explanation: 'You have two overcards and a backdoor flush draw. The pot odds justify a call to see the turn.',
  },
  {
    variant: 'holdem', holeCards: 'ThTd', board: 'Kh9c4s', position: 'BTN', street: 'flop',
    pot: 25, toCall: 0, correctAction: 'bet', difficulty: 'medium',
    explanation: 'You have an overpair to the 9 and 4. Bet for value and protection against overcards.',
  },
  {
    variant: 'holdem', holeCards: '9h8h', board: 'Th7d2c', position: 'SB', street: 'flop',
    pot: 30, toCall: 15, correctAction: 'call', difficulty: 'medium',
    explanation: 'Open-ended straight draw with 8 outs. Pot odds of 3:1 justify calling with ~32% equity.',
  },
  {
    variant: 'holdem', holeCards: 'JhJd', board: '', position: 'CO', street: 'preflop',
    pot: 130, toCall: 65, correctAction: 'call', difficulty: 'medium',
    explanation: 'You opened the CO and got 3-bet (note the inflated pot — your open is already in there). Calling is the standard line: JJ is strong, but a 3-bet range leans to QQ+ and AK that have you dominated, and you flop well in position. Folding is too weak; 4-betting is also fine versus an aggressive 3-bettor — this spot is closer than it looks.',
  },
  {
    variant: 'holdem', holeCards: 'AcQc', board: 'Kc8c3h', position: 'BTN', street: 'flop',
    pot: 40, toCall: 0, correctAction: 'bet', difficulty: 'medium',
    explanation: 'Nut flush draw with an overcard. Semi-bluff bet — you have ~45% equity against most hands and can win the pot immediately.',
  },
  // Hard — nuanced spots
  {
    variant: 'holdem', holeCards: 'AsKs', board: 'Qh9d4c', position: 'BTN', street: 'flop',
    pot: 50, toCall: 35, correctAction: 'call', difficulty: 'hard',
    explanation: 'AK missed the flop but has 6 outs to top pair and backdoor draws. The pot odds are marginal but implied odds make a call profitable.',
  },
  {
    variant: 'holdem', holeCards: 'QhQd', board: 'Ah8c3s7d', position: 'MP', street: 'turn',
    pot: 60, toCall: 40, correctAction: 'fold', difficulty: 'hard',
    explanation: 'Queens are an underpair to the ace. If your opponent is betting the turn after the ace flop, they likely have an ace or better. Fold and save your chips.',
  },
  {
    variant: 'holdem', holeCards: '6h5h', board: '8h7h2d', position: 'BB', street: 'flop',
    pot: 30, toCall: 20, correctAction: 'raise', difficulty: 'hard',
    explanation: 'Open-ended straight flush draw — 15 outs giving you ~54% equity. Raise as a semi-bluff to build the pot and apply pressure.',
  },
  // Preflop "facing a raise" — the L6 layer cross-linked from the Range Academy.
  {
    variant: 'holdem', holeCards: 'KhTc', board: '', position: 'BB', street: 'preflop',
    pot: 35, toCall: 15, correctAction: 'call', difficulty: 'medium',
    explanation: 'Lever: pot odds + position closing the action. KTo is too weak to 3-bet, but you are last to act and getting a great price closing the action from the big blind. Defend by calling against a wide button open.',
  },
  {
    variant: 'holdem', holeCards: 'Ac9d', board: '', position: 'CO', street: 'preflop',
    pot: 35, toCall: 20, correctAction: 'fold', difficulty: 'medium',
    explanation: 'Lever: position + domination. A tight UTG player opened and you are next to act with players still behind. A9 offsuit is dominated by every better ace in that range. Fold — it plays badly out of position and gets crushed when it pairs.',
  },
  {
    variant: 'holdem', holeCards: 'AsTs', board: '', position: 'BTN', street: 'preflop',
    pot: 35, toCall: 20, correctAction: 'raise', difficulty: 'hard',
    explanation: 'Lever: blocker. ATs makes a fine 3-bet against a CO open: the ace blocks AA and AK, it makes the nut flush, and 3-betting lets you play a big pot in position with a hand that flops well. Apply pressure rather than just calling.',
  },
  {
    variant: 'holdem', holeCards: 'QhQs', board: '', position: 'BTN', street: 'preflop',
    pot: 35, toCall: 20, correctAction: 'raise', difficulty: 'easy',
    explanation: 'Lever: raw equity (value). Queens crush a CO opening range. 3-bet for value in position — flatting lets the blinds in cheaply and lets the opener realize equity with hands you dominate.',
  },
  {
    variant: 'holdem', holeCards: '7h6h', board: '', position: 'BB', street: 'preflop',
    pot: 35, toCall: 15, correctAction: 'call', difficulty: 'medium',
    explanation: 'Lever: playability. 76 suited rarely makes top pair, but it flops straights and flushes that win whole stacks. Getting a good price to close the action from the big blind, calling a button open is standard — its playability is exactly why it defends.',
  },
  // PLO scenarios
  {
    variant: 'plo', holeCards: 'AhAdKhKd', board: '', position: 'BTN', street: 'preflop',
    pot: 15, toCall: 0, correctAction: 'raise', difficulty: 'easy',
    explanation: 'AAKKds is the strongest PLO starting hand. Raise for value from any position.',
  },
  {
    variant: 'plo', holeCards: 'Jh9h8d7d', board: 'Th6c2s', position: 'CO', street: 'flop',
    pot: 40, toCall: 0, correctAction: 'bet', difficulty: 'medium',
    explanation: 'You have a wrap straight draw (J-9-8-7 around T-6) with multiple nut straight possibilities. Bet for value with your massive draw.',
  },
];
