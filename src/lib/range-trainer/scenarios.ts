// Built-in scenarios — the offline fallback set. Each one matches the exact
// shape the AI returns, so the UI treats live and built-in spots identically.
//
// Ranges are one strong, reasonable line — not solver-perfect, and not the
// only answer. They are expressed as 169 hand classes (e.g. "AKs" = all four
// suited combos) because that is the resolution of the 13x13 grid.

export type Street = 'preflop' | 'flop';

export interface Scenario {
  id: string;
  street: Street;
  title: string;
  setup: string;
  /** Three cards like "Ks 7d 2c", or null for preflop. */
  board: string | null;
  referenceRange: string[];
  keyIdeas: string;
}

export const BUILTIN_SCENARIOS: Scenario[] = [
  {
    id: 'pf-btn-open',
    street: 'preflop',
    title: 'Button open',
    setup:
      '6-max cash, 100bb. It folds to you on the button. Build your opening (raise-first-in) range from the button.',
    board: null,
    referenceRange: [
      '22', '33', '44', '55', '66', '77', '88', '99', 'TT', 'JJ', 'QQ', 'KK', 'AA',
      'A2s', 'A3s', 'A4s', 'A5s', 'A6s', 'A7s', 'A8s', 'A9s', 'ATs', 'AJs', 'AQs', 'AKs',
      'K6s', 'K7s', 'K8s', 'K9s', 'KTs', 'KJs', 'KQs',
      'Q8s', 'Q9s', 'QTs', 'QJs', 'J8s', 'J9s', 'JTs', 'T8s', 'T9s',
      '97s', '98s', '87s', '76s', '65s', '54s',
      'A2o', 'A3o', 'A4o', 'A5o', 'A8o', 'A9o', 'ATo', 'AJo', 'AQo', 'AKo',
      'K9o', 'KTo', 'KJo', 'KQo', 'Q9o', 'QTo', 'QJo', 'J9o', 'JTo', 'T9o',
    ],
    keyIdeas:
      "The button is the best seat at the table, so you open very wide — roughly the top 45–50% of hands — because you'll have position for the rest of the hand and the blinds defend imperfectly. Almost any suited hand and most offsuit broadways are profitable opens. The hands you fold are the genuinely weak offsuit holdings: small offsuit gappers and weak offsuit aces with no suit or connectivity.",
  },
  {
    id: 'pf-lj-open',
    street: 'preflop',
    title: 'Early-position open',
    setup:
      '6-max cash, 100bb. You are first to act (lojack / UTG) and it folds to you. Build your opening range from early position with the whole table still to act behind you.',
    board: null,
    referenceRange: [
      '22', '33', '44', '55', '66', '77', '88', '99', 'TT', 'JJ', 'QQ', 'KK', 'AA',
      'A2s', 'A3s', 'A4s', 'A5s', 'A6s', 'A7s', 'A8s', 'A9s', 'ATs', 'AJs', 'AQs', 'AKs',
      'K9s', 'KTs', 'KJs', 'KQs', 'Q9s', 'QTs', 'QJs', 'J9s', 'JTs', 'T8s', 'T9s',
      '98s', '87s', '76s', '65s', '54s',
      'AJo', 'AQo', 'AKo', 'KQo',
    ],
    keyIdeas:
      'From early position five players can wake up with a strong hand behind you, so you open tight — roughly the top 16–18%. Lean on hands that make strong top pairs and dominate the ranges that continue: big pairs, suited broadways, and suited aces (kept partly for their blocker and nut-flush value). Offsuit hands have to be genuinely strong (AJo+, KQo) because they flop worse and get dominated.',
  },
  {
    id: 'pf-co-open',
    street: 'preflop',
    title: 'Cutoff open',
    setup:
      '6-max cash, 100bb. It folds to you in the cutoff. Build your opening range with only the button and the blinds left to act.',
    board: null,
    referenceRange: [
      '22', '33', '44', '55', '66', '77', '88', '99', 'TT', 'JJ', 'QQ', 'KK', 'AA',
      'A2s', 'A3s', 'A4s', 'A5s', 'A6s', 'A7s', 'A8s', 'A9s', 'ATs', 'AJs', 'AQs', 'AKs',
      'K5s', 'K6s', 'K7s', 'K8s', 'K9s', 'KTs', 'KJs', 'KQs',
      'Q8s', 'Q9s', 'QTs', 'QJs', 'J8s', 'J9s', 'JTs', 'T7s', 'T8s', 'T9s',
      '97s', '98s', '86s', '87s', '76s', '65s', '54s',
      'A8o', 'A9o', 'ATo', 'AJo', 'AQo', 'AKo',
      'K9o', 'KTo', 'KJo', 'KQo', 'Q9o', 'QTo', 'QJo', 'J9o', 'JTo', 'T9o',
    ],
    keyIdeas:
      'With only three players left to act you open much wider than early position — around the top 26–28%. You can add most suited kings and queens, more suited connectors and gappers, and a band of offsuit broadways and suited-wheel aces. Position on the button and blinds is no longer guaranteed, but you still get to play most pots in position against the blinds.',
  },
  {
    id: 'pf-sb-open',
    street: 'preflop',
    title: 'Small blind open',
    setup:
      '6-max cash, 100bb. It folds to you in the small blind and only the big blind is left. Build your raise-first-in range (assume a raise-or-fold strategy, no limping).',
    board: null,
    referenceRange: [
      '22', '33', '44', '55', '66', '77', '88', '99', 'TT', 'JJ', 'QQ', 'KK', 'AA',
      'A2s', 'A3s', 'A4s', 'A5s', 'A6s', 'A7s', 'A8s', 'A9s', 'ATs', 'AJs', 'AQs', 'AKs',
      'K4s', 'K5s', 'K6s', 'K7s', 'K8s', 'K9s', 'KTs', 'KJs', 'KQs',
      'Q6s', 'Q7s', 'Q8s', 'Q9s', 'QTs', 'QJs', 'J7s', 'J8s', 'J9s', 'JTs',
      'T7s', 'T8s', 'T9s', '96s', '97s', '98s', '86s', '87s', '75s', '76s', '65s', '54s', '43s',
      'A2o', 'A3o', 'A4o', 'A5o', 'A7o', 'A8o', 'A9o', 'ATo', 'AJo', 'AQo', 'AKo',
      'K9o', 'KTo', 'KJo', 'KQo', 'Q9o', 'QTo', 'QJo', 'J9o', 'JTo', 'T9o',
    ],
    keyIdeas:
      "You're out of position against a single big blind who defends very wide, so you raise (not limp) a polarized-to-wide range — about the top 40%. Suited hands dominate the additions because they realize equity best out of position, and you keep strong offsuit broadways and wheel aces. You fold the worst offsuit junk that flops poorly and is hard to play from out of position.",
  },
  {
    id: 'pf-btn-3bet-vs-co',
    street: 'preflop',
    title: 'BTN 3-bet vs CO',
    setup:
      '6-max cash, 100bb. The cutoff opens to 2.5bb and it folds to you on the button. Build your 3-betting (re-raising) range — the hands you want to play for a raise rather than flat.',
    board: null,
    referenceRange: [
      '99', 'TT', 'JJ', 'QQ', 'KK', 'AA',
      'AJs', 'AQs', 'AKs', 'KQs',
      'A2s', 'A3s', 'A4s', 'A5s', '54s', '65s', '76s',
      'AQo', 'AKo', 'KQo',
    ],
    keyIdeas:
      "In position against a cutoff open you 3-bet a polarized range: clear value (big pairs, AQ+, KQs) that wants money in now, plus blocker bluffs — suited wheel aces that block AA/AK and suited connectors that flop well and unblock folds. The medium hands you'd rather flat in position keep your calling range strong, so they're left out of the 3-bet.",
  },
  {
    id: 'pf-bb-defend-vs-btn',
    street: 'preflop',
    title: 'BB defend vs BTN',
    setup:
      "6-max cash, 100bb. The button opens to 2.5bb, the small blind folds, and you're in the big blind. Build your flat-calling (defend) range — closing the action by calling rather than 3-betting.",
    board: null,
    referenceRange: [
      '22', '33', '44', '55', '66', '77', '88', '99', 'TT', 'JJ',
      'A2s', 'A3s', 'A4s', 'A5s', 'A6s', 'A7s', 'A8s', 'A9s', 'ATs', 'AJs', 'AQs',
      'K2s', 'K3s', 'K4s', 'K5s', 'K6s', 'K7s', 'K8s', 'K9s', 'KTs', 'KJs', 'KQs',
      'Q4s', 'Q5s', 'Q6s', 'Q7s', 'Q8s', 'Q9s', 'QTs', 'QJs',
      'J6s', 'J7s', 'J8s', 'J9s', 'JTs', 'T6s', 'T7s', 'T8s', 'T9s',
      '95s', '96s', '97s', '98s', '85s', '86s', '87s', '74s', '75s', '76s',
      '64s', '65s', '53s', '54s', '43s',
      'A2o', 'A3o', 'A4o', 'A5o', 'A6o', 'A7o', 'A8o', 'A9o', 'ATo', 'AJo', 'AQo',
      'K7o', 'K8o', 'K9o', 'KTo', 'KJo', 'KQo', 'Q8o', 'Q9o', 'QTo', 'QJo',
      'J8o', 'J9o', 'JTo', 'T8o', 'T9o', '98o', '87o', '76o',
    ],
    keyIdeas:
      "You're getting a great price to close the action — you only have to call a little more to see a flop and you'll never face another raise — so you defend extremely wide. Suited hands that flop pairs, draws, and backdoors are the backbone; offsuit broadways and aces fill in. The strongest hands (QQ+, AK) are 3-bet instead, so they're not in this flatting range. Fold only the truly unplayable offsuit junk.",
  },
  {
    id: 'fl-cbet-dry-king',
    street: 'flop',
    title: 'C-bet a K-high flop',
    setup:
      '6-max cash, 100bb. You opened from the lojack and only the big blind called. The flop is K72 rainbow and the big blind checks to you. Build the part of your range you\'d continue betting (c-bet) here.',
    board: 'Ks 7d 2c',
    referenceRange: [
      'AA', 'KK', '77', '22', 'AKs', 'AKo', 'KQs', 'KJs', 'KTs', 'AQs', 'AJs', 'ATs',
      'A5s', 'A4s', 'QJs', 'JTs', 'T9s', '98s',
    ],
    keyIdeas:
      "On a dry, disconnected K-high board you hold both the range and equity advantage, so you can bet a small size with a wide range. Bet your value (top pair and better, plus sets) together with high-equity semi-bluffs — overcards that can barrel later and suited connectors with a backdoor flush. You don't have to bet your entire range, but value plus good backdoor equity is the core of it.",
  },
  {
    id: 'fl-cbet-wet-board',
    street: 'flop',
    title: 'C-bet a wet board',
    setup:
      '6-max cash, 100bb. You opened the button, the big blind called, and the flop comes 9-8-6 with two spades. The big blind checks. Build the part of your range you\'d continue betting on this wet, connected board.',
    board: '9s 8s 6h',
    referenceRange: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '66',
      '98s', 'T9s', 'A9s', 'K9s', '97s', '87s', '76s', '65s',
      'JTs', 'T8s', 'ATs', 'KTs', 'QTs', 'A8s',
    ],
    keyIdeas:
      'A wet, connected board hits the big blind\'s calling range hard, so your range and equity edge shrink — bet more selectively and lean toward a bigger size when you do. Continue with strong made hands (overpairs, sets, two pair, top pair) and high-equity draws: open-enders, combo and flush draws, and overcards that carry a backdoor. Marginal made hands and pure air are better as checks to control the pot out of position for the caller.',
  },
  {
    id: 'fl-cbet-paired',
    street: 'flop',
    title: 'C-bet a paired board',
    setup:
      '6-max cash, 100bb. You opened the cutoff and the big blind called. The flop is KK4 rainbow and the big blind checks. Build the part of your range you\'d continue betting on this paired, dry board.',
    board: 'Kd Ks 4c',
    referenceRange: [
      'AA', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44',
      'AKs', 'AKo', 'KQs', 'KJs', 'KTs', 'K9s',
      'AQs', 'AJs', 'ATs', 'A5s', 'A4s', 'AQo', 'AJo',
      'QJs', 'JTs', 'T9s',
    ],
    keyIdeas:
      "A paired, dry board barely improves the caller — they rarely hold a king and there are almost no draws — so it heavily favors the preflop raiser. C-bet small at high frequency: trips and full houses for value, every pocket pair (your showdown value is great), ace-highs and backdoor hands as the bets that deny equity. The board is so dry you can even fire pure overcards and pick up the pot often.",
  },
  {
    id: 'fl-cbet-low-board',
    street: 'flop',
    title: 'C-bet a low board',
    setup:
      '6-max cash, 100bb. You opened the button and the big blind called. The flop is 7-5-2 rainbow and the big blind checks. Build the part of your range you\'d continue betting on this low, dry board.',
    board: '7c 5d 2s',
    referenceRange: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '55', '22',
      '75s', 'A7s', 'K7s', '76s', '87s', '65s',
      'A5s', 'A4s', 'A3s', 'A2s', 'ATs', 'A9s', 'A8s', 'A6s', '86s', '64s',
    ],
    keyIdeas:
      'A low, disconnected rainbow board still favors the button: you hold the overpairs and strong aces the big blind mostly lacks. Continue with a wide, mostly small c-bet — overpairs and sets for value, top pair (sevens) and two pair, plus straight draws (open-enders and gutters) and overcard aces with backdoor flush equity. Slow down only the hands with no pair and no draw, which have little to gain by betting.',
  },
];

/** A random built-in scenario, optionally filtered to a street. */
export function randomScenario(street?: Street): Scenario {
  const pool = street ? BUILTIN_SCENARIOS.filter((s) => s.street === street) : BUILTIN_SCENARIOS;
  const list = pool.length > 0 ? pool : BUILTIN_SCENARIOS;
  return list[Math.floor(Math.random() * list.length)];
}
