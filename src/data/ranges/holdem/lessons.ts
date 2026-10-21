// Curriculum copy + step config for the Learn mode of the Range Academy.
// Each lesson maps onto the poker-master's L1-L4 levels plus a recap.

export type RfiSeat = 'UTG' | 'MP' | 'CO' | 'BTN' | 'SB';

export interface LessonStep {
  id: string;
  /** which curriculum level this maps to, for the badge */
  level: string;
  title: string;
  teachingText: string;
  /** the seat whose range the matrix shows when the step opens */
  defaultSeat: RfiSeat;
  /** seats the L3 step can walk through to dramatize widening */
  seatProgression?: RfiSeat[];
  /** cells to keep bright; everything else dims. undefined = all bright */
  highlight?: (row: number, col: number) => boolean;
  /** special interactive widget the card should render */
  widget?: 'a9o-reveal' | 'opening-counter' | 'side-by-side';
}

// Bullets for the "Why ranges matter" collapsible intro.
export const whyRangesMatter: string[] = [
  'A preflop range is the full set of hands you play a given way from a given seat — not a single hand, but a policy.',
  'The same two cards can be a clear open from the button and an instant fold under the gun. Position, not the cards, decides.',
  'Ranges are dials, not switches: some hands open every time, some open only part of the time (the gold "mixed" cells).',
  'Four levers decide whether a hand makes the cut: raw equity, position, post-flop playability, and blocker/domination effects.',
  'Learn the shape once and you stop guessing hand-by-hand — you just know where the line is for each seat.',
];

// A9o lives at offsuit row=idx(9)=5, col=idx(A)=0.
const isA9o = (r: number, c: number) => r === 5 && c === 0;
// 76s suited row=idx(7)=7, col=idx(6)=8.  KJo offsuit row=idx(J)=3, col=idx(K)=1.
const is76sOrKJo = (r: number, c: number) =>
  (r === 7 && c === 8) || (r === 3 && c === 1);

export const LESSONS: LessonStep[] = [
  {
    id: 'same-cards',
    level: 'L1',
    title: 'Same cards, different answer',
    teachingText:
      "A9 offsuit is the perfect teacher. Under the gun, with eight players left to act, it's a fold — too easily dominated by bigger aces. On the button, with only the blinds behind you, the same hand is a clear open. The cards never changed. Your seat did. That's the whole game.",
    defaultSeat: 'UTG',
    highlight: isA9o,
    widget: 'a9o-reveal',
  },
  {
    id: 'read-the-grid',
    level: 'L2',
    title: 'Read the grid',
    teachingText:
      'The 13x13 grid holds every starting hand. The diagonal is the pocket pairs (AA down to 22). Above the diagonal are the suited hands; below it are the offsuit hands. Emerald cells open always, gold cells are mixed (open some of the time), red cells are folds. Suited hands sit on top because they make flushes — that extra playability matters.',
    defaultSeat: 'BTN',
    highlight: (r, c) => r <= c, // pairs + suited triangle
  },
  {
    id: 'position-is-power',
    level: 'L3',
    title: 'Position is power',
    teachingText:
      "Walk the seat from under the gun to the button and watch the colored region bloom outward. The opening frequency climbs from roughly 16% to roughly 45%. Acting last is worth real money: you see what everyone does before you decide, so you can profitably play many more hands.",
    defaultSeat: 'UTG',
    seatProgression: ['UTG', 'MP', 'CO', 'BTN'],
    widget: 'opening-counter',
  },
  {
    id: 'why-a-hand-gets-in',
    level: 'L4',
    title: 'Why a hand gets in',
    teachingText:
      "76 suited and KJ offsuit open from similar seats for opposite reasons. KJo wins by raw high-card equity — it makes good top pairs. 76s makes almost no top pairs, but it flops straights and flushes that win whole stacks. Different lever, same conclusion: both are opens. Knowing the lever tells you how to play the hand after the flop.",
    defaultSeat: 'CO',
    highlight: is76sOrKJo,
    widget: 'side-by-side',
  },
  {
    id: 'recap',
    level: 'Recap',
    title: 'Put it together',
    teachingText:
      'You can read the grid, you know position widens the range, and you know the four levers — equity, position, playability, and blockers — that decide each hand. Now prove it: the Drill hands you a blank board and a seat, you paint in the opens, and you get scored on exactly where your line drifts from the solver.',
    defaultSeat: 'BTN',
  },
];
