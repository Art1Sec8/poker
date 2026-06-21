import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeRange } from '@/lib/range-trainer/grid';
import { grade } from '@/lib/range-trainer/grading';
import { randomScenario, Scenario, Street } from '@/lib/range-trainer/scenarios';

// The Anthropic API is called ONLY from this server-side route handler.
// The API key is read from ANTHROPIC_API_KEY and never reaches the browser.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Trivial to change to a faster/cheaper model later.
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT =
  'You are a sharp, encouraging No-Limit Texas Hold\'em coach. Explain the ' +
  'reasoning behind ranges so the student builds intuition rather than ' +
  'memorizing charts. Be concise, concrete, and plain-spoken.';

type Mode = 'scenario' | 'grade' | 'walkthrough' | 'chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CoachBody {
  mode: Mode;
  street?: Street;
  scenario?: Scenario;
  selected?: string[];
  history?: ChatMessage[];
  question?: string;
}

function hasKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
}

const CHAT_OFFLINE_NOTICE =
  'Live follow-up questions need an Anthropic API key. Add ANTHROPIC_API_KEY to ' +
  '.env.local and restart to ask the coach about this exact spot. In the meantime, ' +
  'the key ideas above explain the reasoning behind this range.';

/** Built-in / no-API response, keyed by mode. */
function offlineResponse(body: CoachBody, fromError = false): NextResponse {
  const { mode, street, scenario } = body;
  switch (mode) {
    case 'scenario':
      return NextResponse.json({ offline: true, fromError, scenario: randomScenario(street) });
    case 'grade':
    case 'walkthrough':
      return NextResponse.json({
        offline: true,
        fromError,
        text: scenario?.keyIdeas ?? '',
      });
    case 'chat':
      return NextResponse.json({ offline: true, fromError, text: CHAT_OFFLINE_NOTICE });
    default:
      return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
  }
}

function textFromMessage(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

/** Extract the first JSON object from a model reply, tolerating code fences. */
function extractJson(raw: string): unknown {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) throw new Error('No JSON object found');
  return JSON.parse(s.slice(start, end + 1));
}

async function handleScenario(client: Anthropic, street?: Street): Promise<NextResponse> {
  const focus =
    street === 'flop'
      ? 'This must be a FLOP spot. Include a specific three-card board and make the task ' +
        'about which part of a range to continue with / c-bet on that exact texture.'
      : street === 'preflop'
        ? 'This must be a PREFLOP spot (board must be null). Make the task about building a ' +
          'preflop range (an open, a 3-bet, or a blind defend).'
        : 'It may be a preflop or a flop spot.';

  const prompt =
    `Generate one Hold'em range-building spot. Vary the position and situation each time. ` +
    `Assume 6-max cash, 100bb effective, with a strong, thinking regular as the villain. ` +
    `${focus}\n\n` +
    `Return ONLY this JSON object and nothing else (no prose, no code fences):\n` +
    `{\n` +
    `  "title": "<= 4 word label",\n` +
    `  "setup": "2-3 sentences: stack/position context, exact action so far, whose range to build and what decision it represents",\n` +
    `  "board": "three cards like \\"Ks 7d 2c\\", or null for preflop",\n` +
    `  "referenceRange": ["canonical hand strings like AKs, A5o, 77"],\n` +
    `  "keyIdeas": "2-3 sentences on the logic of this range"\n` +
    `}\n\n` +
    `Use canonical notation: higher card first, "s"/"o" suffix for suited/offsuit, ` +
    `no suffix for pairs, "T" for ten. The referenceRange should be one strong, reasonable range.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const parsed = extractJson(textFromMessage(message)) as Record<string, unknown>;
  const referenceRange = normalizeRange(parsed.referenceRange);
  if (referenceRange.length === 0) throw new Error('Empty range from model');

  let board: string | null = null;
  if (typeof parsed.board === 'string' && parsed.board.trim().toLowerCase() !== 'null') {
    board = parsed.board.trim();
  }

  const scenario: Scenario = {
    id: `ai-${Date.now()}`,
    street: board ? 'flop' : 'preflop',
    title: String(parsed.title ?? 'Range spot').slice(0, 40),
    setup: String(parsed.setup ?? ''),
    board,
    referenceRange,
    keyIdeas: String(parsed.keyIdeas ?? ''),
  };

  return NextResponse.json({ offline: false, scenario });
}

function describeScenario(scenario: Scenario): string {
  return (
    `Spot: ${scenario.title}\n` +
    `${scenario.setup}\n` +
    (scenario.board ? `Board: ${scenario.board}\n` : 'Street: preflop\n') +
    `Reference range (one strong, reasonable answer): ${scenario.referenceRange.join(', ')}`
  );
}

async function handleGrade(
  client: Anthropic,
  scenario: Scenario,
  selected: string[],
): Promise<NextResponse> {
  const cleanSelected = normalizeRange(selected);
  const g = grade(cleanSelected, scenario.referenceRange);

  const prompt =
    `${describeScenario(scenario)}\n\n` +
    `The student painted a range. Graded against the reference:\n` +
    `- Correct (in both): ${g.correct.join(', ') || '(none)'}\n` +
    `- Too loose (painted, not in reference): ${g.tooLoose.join(', ') || '(none)'}\n` +
    `- Missed (in reference, not painted): ${g.missed.join(', ') || '(none)'}\n\n` +
    `Write ~140-180 words. Start with one line on what they got right. Then give the most ` +
    `important corrections grouped BY REASON (not hand-by-hand), tied to position, board ` +
    `texture, blockers, combos, and equity. End with a one-sentence takeaway. Plain prose, no lists.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  return NextResponse.json({ offline: false, text: textFromMessage(message) });
}

async function handleWalkthrough(client: Anthropic, scenario: Scenario): Promise<NextResponse> {
  const prompt =
    `${describeScenario(scenario)}\n\n` +
    `Teach the student how to BUILD this range from scratch in ~160-200 words. Cover: the ` +
    `hands that clearly belong and why, how to reason about the borderline hands, and what to ` +
    `leave out and why. Tie it to position, board texture, blockers, and equity. Plain prose.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  return NextResponse.json({ offline: false, text: textFromMessage(message) });
}

async function handleChat(
  client: Anthropic,
  scenario: Scenario,
  history: ChatMessage[],
  question: string,
): Promise<NextResponse> {
  const system =
    `${SYSTEM_PROMPT}\n\n` +
    `You are answering follow-up questions about this exact spot:\n` +
    `${describeScenario(scenario)}\n\n` +
    `Keep every answer under ~120 words. Reference specific hands when it helps.`;

  const messages: ChatMessage[] = [
    ...history.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content),
    { role: 'user', content: question },
  ];

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages,
  });

  return NextResponse.json({ offline: false, text: textFromMessage(message) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: CoachBody;
  try {
    body = (await request.json()) as CoachBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || !body.mode) {
    return NextResponse.json({ error: 'Missing mode' }, { status: 400 });
  }

  // No key -> deterministic offline behavior for every mode.
  if (!hasKey()) return offlineResponse(body);

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    switch (body.mode) {
      case 'scenario':
        return await handleScenario(client, body.street);
      case 'grade':
        if (!body.scenario) return NextResponse.json({ error: 'Missing scenario' }, { status: 400 });
        return await handleGrade(client, body.scenario, body.selected ?? []);
      case 'walkthrough':
        if (!body.scenario) return NextResponse.json({ error: 'Missing scenario' }, { status: 400 });
        return await handleWalkthrough(client, body.scenario);
      case 'chat':
        if (!body.scenario || !body.question)
          return NextResponse.json({ error: 'Missing scenario or question' }, { status: 400 });
        return await handleChat(client, body.scenario, body.history ?? [], body.question);
      default:
        return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
    }
  } catch (error) {
    // Any API failure falls back to the built-in / written content so the app
    // keeps working. The UI shows a small "offline" notice.
    console.error('range-coach error:', error);
    return offlineResponse(body, true);
  }
}
