'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import HandGrid from '@/components/trainer/HandGrid';
import { grade, tallyText, type GradeResult } from '@/lib/range-trainer/grading';
import { normalizeRange } from '@/lib/range-trainer/grid';
import { randomScenario, type Scenario, type Street } from '@/lib/range-trainer/scenarios';

const C = {
  base: '#15120F',
  panel: '#1F1B16',
  hairline: '#352D24',
  paper: '#EDE6DA',
  muted: '#9A8E7D',
  green: '#5FA587',
  red: '#C8102E',
  gold: '#D9A441',
  ink: '#15120F',
};

const UI = "'Space Grotesk', ui-sans-serif, system-ui, sans-serif";
const MONO = "'Space Mono', ui-monospace, monospace";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type CoachKind = 'grade' | 'walkthrough' | null;

export default function TrainerPage() {
  const [focus, setFocus] = useState<Street>('preflop');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [graded, setGraded] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);

  const [coachKind, setCoachKind] = useState<CoachKind>(null);
  const [coachText, setCoachText] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachOffline, setCoachOffline] = useState(false);

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOffline, setChatOffline] = useState(false);

  const [dealLoading, setDealLoading] = useState(false);
  const [dealOffline, setDealOffline] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Seed an instant spot on first load so the screen is never empty.
  useEffect(() => {
    setScenario(randomScenario('preflop'));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [chat, reducedMotion]);

  const resetForNewSpot = () => {
    setSelected(new Set());
    setGraded(false);
    setResult(null);
    setCoachKind(null);
    setCoachText('');
    setCoachOffline(false);
    setChat([]);
    setChatOffline(false);
  };

  async function deal(street: Street) {
    setFocus(street);
    setDealLoading(true);
    try {
      const res = await fetch('/api/range-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'scenario', street }),
      });
      const data = await res.json();
      if (data?.scenario) {
        resetForNewSpot();
        setScenario(data.scenario as Scenario);
        setDealOffline(Boolean(data.offline));
      } else {
        throw new Error(data?.error || 'No scenario');
      }
    } catch {
      // Hard fallback if the network itself fails.
      resetForNewSpot();
      setScenario(randomScenario(street));
      setDealOffline(true);
    } finally {
      setDealLoading(false);
    }
  }

  const onPaint = useCallback((hand: string, value: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (value) next.add(hand);
      else next.delete(hand);
      return next;
    });
  }, []);

  function clearAll() {
    setSelected(new Set());
    setGraded(false);
    setResult(null);
    setCoachKind(null);
    setCoachText('');
  }

  async function check() {
    if (!scenario) return;
    const g = grade(selected, scenario.referenceRange);
    setResult(g);
    setGraded(true);
    setCoachKind('grade');
    setCoachLoading(true);
    setCoachOffline(false);
    try {
      const res = await fetch('/api/range-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'grade', scenario, selected: [...selected] }),
      });
      const data = await res.json();
      setCoachText(data?.text || scenario.keyIdeas);
      setCoachOffline(Boolean(data?.offline));
    } catch {
      setCoachText(scenario.keyIdeas);
      setCoachOffline(true);
    } finally {
      setCoachLoading(false);
    }
  }

  async function walkthrough() {
    if (!scenario) return;
    // Reveal the reference range on the grid (neutral, no green/red judgement).
    setSelected(new Set(normalizeRange(scenario.referenceRange)));
    setGraded(false);
    setResult(null);
    setCoachKind('walkthrough');
    setCoachLoading(true);
    setCoachOffline(false);
    try {
      const res = await fetch('/api/range-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'walkthrough', scenario }),
      });
      const data = await res.json();
      setCoachText(data?.text || scenario.keyIdeas);
      setCoachOffline(Boolean(data?.offline));
    } catch {
      setCoachText(scenario.keyIdeas);
      setCoachOffline(true);
    } finally {
      setCoachLoading(false);
    }
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q || !scenario || chatLoading) return;
    const history = chat;
    setChat((prev) => [...prev, { role: 'user', content: q }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/range-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'chat', scenario, history, question: q }),
      });
      const data = await res.json();
      setChatOffline(Boolean(data?.offline));
      setChat((prev) => [...prev, { role: 'assistant', content: data?.text || 'Sorry, no answer.' }]);
    } catch {
      setChatOffline(true);
      setChat((prev) => [
        ...prev,
        { role: 'assistant', content: 'Could not reach the coach. Check your connection.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const panel = {
    backgroundColor: C.panel,
    border: `1px solid ${C.hairline}`,
  } as const;

  return (
    <main
      className="min-h-screen pb-28"
      style={{ backgroundColor: C.base, color: C.paper, fontFamily: UI }}
    >
      <div className="mx-auto max-w-5xl px-4 pt-6">
        {/* Header */}
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: UI }}>
            Range Trainer
          </h1>
          <p className="text-sm" style={{ color: C.muted }}>
            Build a villain&apos;s range on the grid, then get graded and coached on why.
          </p>
        </header>

        {/* Focus + Deal controls */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg p-0.5" style={{ backgroundColor: C.panel, border: `1px solid ${C.hairline}` }}>
            {(['preflop', 'flop'] as Street[]).map((s) => (
              <button
                key={s}
                onClick={() => setFocus(s)}
                className="rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: focus === s ? C.gold : 'transparent',
                  color: focus === s ? C.ink : C.muted,
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={() => deal(focus)}
            disabled={dealLoading}
            className="rounded-lg px-4 py-2 text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: C.paper, color: C.ink }}
          >
            {dealLoading ? 'Dealing…' : 'Deal a spot'}
          </button>
          {dealOffline && <OfflineBadge label="built-in spot" />}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Left column: scenario + grid */}
          <section>
            {scenario && <ScenarioCard scenario={scenario} />}

            {/* Grid */}
            <div className="mt-4 rounded-xl p-3" style={panel}>
              <div className="mx-auto" style={{ maxWidth: 560 }}>
                <HandGrid
                  selected={selected}
                  onPaint={onPaint}
                  graded={graded}
                  result={result}
                  reducedMotion={reducedMotion}
                />
              </div>
              <GridLegend />
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={check}
                disabled={!scenario || selected.size === 0}
                className="rounded-lg px-4 py-2 text-sm font-bold transition-opacity disabled:opacity-40"
                style={{ backgroundColor: C.green, color: C.ink }}
              >
                Check my range
              </button>
              <button
                onClick={walkthrough}
                disabled={!scenario}
                className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40"
                style={{ backgroundColor: 'transparent', color: C.paper, border: `1px solid ${C.hairline}` }}
              >
                Walk me through it
              </button>
              <button
                onClick={clearAll}
                disabled={selected.size === 0 && !graded}
                className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40"
                style={{ backgroundColor: 'transparent', color: C.muted, border: `1px solid ${C.hairline}` }}
              >
                Clear
              </button>

              {graded && result && (
                <span className="ml-auto text-sm" style={{ fontFamily: MONO, color: C.paper }}>
                  {tallyText(result)}
                </span>
              )}
            </div>

            {graded && (
              <p className="mt-2 text-xs" style={{ color: C.muted }}>
                The reference is one strong, reasonable range — not the only answer.
              </p>
            )}
          </section>

          {/* Right column: coach + chat */}
          <aside className="flex flex-col gap-4">
            <CoachPanel
              kind={coachKind}
              text={coachText}
              loading={coachLoading}
              offline={coachOffline}
              fallbackKeyIdeas={scenario?.keyIdeas ?? ''}
            />

            <ChatPanel
              chat={chat}
              input={chatInput}
              setInput={setChatInput}
              onSubmit={sendChat}
              loading={chatLoading}
              offline={chatOffline}
              disabled={!scenario}
              endRef={chatEndRef}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ----------------------------- subcomponents ----------------------------- */

function OfflineBadge({ label }: { label: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ backgroundColor: 'rgba(217,164,65,0.12)', color: C.gold, border: `1px solid ${C.hairline}` }}
    >
      {label}
    </span>
  );
}

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: C.panel, border: `1px solid ${C.hairline}` }}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">{scenario.title}</h2>
        <span
          className="shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: C.muted, border: `1px solid ${C.hairline}` }}
        >
          {scenario.street}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: C.paper }}>
        {scenario.setup}
      </p>
      {scenario.board && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
            Flop
          </span>
          <Board board={scenario.board} />
        </div>
      )}
    </div>
  );
}

function Board({ board }: { board: string }) {
  const cards = board.trim().split(/\s+/);
  const suitGlyph: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const isRed = (suit: string) => suit === 'h' || suit === 'd';
  return (
    <div className="flex gap-1.5">
      {cards.map((card, idx) => {
        const rank = card.slice(0, -1).toUpperCase();
        const suit = card.slice(-1).toLowerCase();
        return (
          <span
            key={idx}
            className="inline-flex h-8 min-w-[28px] items-center justify-center rounded px-1 text-sm font-bold"
            style={{
              backgroundColor: C.base,
              border: `1px solid ${C.hairline}`,
              color: isRed(suit) ? '#E07A86' : C.paper,
              fontFamily: MONO,
            }}
          >
            {rank}
            {suitGlyph[suit] ?? suit}
          </span>
        );
      })}
    </div>
  );
}

function GridLegend() {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: C.muted }}>
        <span>↘ diagonal = pairs</span>
        <span>↗ upper-right = suited</span>
        <span>↙ lower-left = offsuit</span>
        <span style={{ fontFamily: MONO }}>(label shows the two ranks; region sets suited/offsuit)</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <LegendDot color={C.green} label="correct" />
        <LegendDot color={C.red} label="too loose" />
        <LegendDot color={C.gold} label="missed" />
        <LegendDot color="rgba(237,230,218,0.16)" label="selected (before check)" ring />
      </div>
    </div>
  );
}

function LegendDot({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: C.muted }}>
      <span
        className="inline-block h-3 w-3 rounded-[3px]"
        style={{ backgroundColor: color, boxShadow: ring ? `inset 0 0 0 1.5px ${C.paper}` : 'none' }}
      />
      {label}
    </span>
  );
}

function CoachPanel({
  kind,
  text,
  loading,
  offline,
  fallbackKeyIdeas,
}: {
  kind: CoachKind;
  text: string;
  loading: boolean;
  offline: boolean;
  fallbackKeyIdeas: string;
}) {
  const title = kind === 'walkthrough' ? 'Walkthrough' : kind === 'grade' ? 'Coach feedback' : 'Coach';
  const body = text || (kind ? fallbackKeyIdeas : '');

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: C.panel, border: `1px solid ${C.hairline}` }}>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
        {offline && <OfflineBadge label="key ideas" />}
      </div>
      {loading ? (
        <p className="text-sm" style={{ color: C.muted }}>
          Thinking…
        </p>
      ) : body ? (
        <p className="text-sm leading-relaxed" style={{ color: C.paper }}>
          {body}
        </p>
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
          Paint the range, then hit <strong style={{ color: C.paper }}>Check my range</strong> for graded
          feedback — or <strong style={{ color: C.paper }}>Walk me through it</strong> to build it from scratch.
        </p>
      )}
    </div>
  );
}

function ChatPanel({
  chat,
  input,
  setInput,
  onSubmit,
  loading,
  offline,
  disabled,
  endRef,
}: {
  chat: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  offline: boolean;
  disabled: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex flex-col rounded-xl p-4" style={{ backgroundColor: C.panel, border: `1px solid ${C.hairline}` }}>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider">Ask about this spot</h3>

      {offline && (
        <p
          className="mb-2 rounded-md px-2 py-1.5 text-xs"
          style={{ backgroundColor: 'rgba(217,164,65,0.10)', color: C.gold }}
        >
          Live questions need an Anthropic API key. Add one to <code style={{ fontFamily: MONO }}>.env.local</code>{' '}
          and restart.
        </p>
      )}

      {chat.length > 0 && (
        <div className="mb-2 max-h-64 space-y-2 overflow-y-auto pr-1">
          {chat.map((m, i) => (
            <div
              key={i}
              className="rounded-lg px-3 py-2 text-sm leading-relaxed"
              style={{
                backgroundColor: m.role === 'user' ? 'rgba(237,230,218,0.06)' : C.base,
                border: `1px solid ${C.hairline}`,
                color: m.role === 'user' ? C.muted : C.paper,
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="px-1 text-sm" style={{ color: C.muted }}>
              Coach is typing…
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-auto flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder="e.g. why is A5s in but A9o out?"
          className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2"
          style={{
            backgroundColor: C.base,
            border: `1px solid ${C.hairline}`,
            color: C.paper,
            ['--tw-ring-color' as string]: C.gold,
          }}
        />
        <button
          type="submit"
          disabled={disabled || loading || !input.trim()}
          className="rounded-lg px-3 py-2 text-sm font-bold transition-opacity disabled:opacity-40"
          style={{ backgroundColor: C.gold, color: C.ink }}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
