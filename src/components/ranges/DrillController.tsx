'use client';

import { useMemo, useState } from 'react';
import { Position } from '@/engine/types';
import { RangeMatrix, type GradeResult } from './RangeMatrix';
import { Scorecard, ScorecardData, WeakSpot } from './Scorecard';
import {
  getRfiRange,
  getRangeLabel,
  isRangeSuited,
  explainHand,
  openingPercent,
} from '@/data/ranges/holdem/ranges';
import { logCoachEvent } from '@/lib/coachFeed';

function combos(row: number, col: number): number {
  const t = isRangeSuited(row, col);
  return t === 'pair' ? 6 : t === 'suited' ? 4 : 12;
}

export function DrillController({ position }: { position: Position }) {
  const target = getRfiRange(position);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  function toggle(row: number, col: number) {
    if (submitted) return;
    const key = `${row}-${col}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function reset() {
    setSelected(new Set());
    setSubmitted(false);
  }

  const { graded, scorecard } = useMemo(() => {
    const graded = new Map<string, GradeResult>();
    const fps: WeakSpot[] = [];
    const fns: WeakSpot[] = [];
    let correct = 0;
    let coinFlipCount = 0;
    let userWeighted = 0;

    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const key = `${r}-${c}`;
        const freq = target[r][c];
        const inRange = freq >= 0.3;
        const isMixed = freq >= 0.3 && freq < 0.7;
        const userOpened = selected.has(key);
        if (userOpened) userWeighted += combos(r, c);

        if (isMixed) {
          // Coin-flip: correct either way, just flag it.
          coinFlipCount++;
          correct++;
          if (userOpened) graded.set(key, 'tp');
          continue;
        }
        if (userOpened && inRange) {
          correct++;
          graded.set(key, 'tp');
        } else if (userOpened && !inRange) {
          graded.set(key, 'fp');
          fps.push({
            label: getRangeLabel(r, c),
            text: explainHand(r, c, position, freq).text,
          });
        } else if (!userOpened && inRange) {
          graded.set(key, 'fn');
          fns.push({
            label: getRangeLabel(r, c),
            text: explainHand(r, c, position, freq).text,
          });
        } else {
          correct++; // true negative
        }
      }
    }

    const total = 169;
    const accuracy = correct / total;
    const userPct = (userWeighted / 1326) * 100;
    const targetPct = openingPercent(target);

    // Worst offenders by combo weight.
    const topFps = fps.slice(0, 4);
    const topFns = fns.slice(0, 4);

    let leakSummary: string;
    if (fps.length === 0 && fns.length === 0) {
      leakSummary = `Clean range from ${position}. Your opens match the solver — no dominated junk, no folded value.`;
    } else if (fps.length > fns.length) {
      leakSummary = `You open too many dominated offsuit hands from ${position}. Tighten up: weak offsuit kickers get crushed when they hit.`;
    } else if (fns.length > fps.length) {
      leakSummary = `You fold too many playable suited hands from ${position}. Suited connectors and suited aces earn their spot through flops, not high-card strength.`;
    } else {
      leakSummary = `Mixed bag from ${position}: you're opening some junk and folding some value. Lean on the four levers to clean up both edges.`;
    }

    const scorecard: ScorecardData = {
      accuracy,
      correct,
      total,
      userPct,
      targetPct,
      falsePositives: topFps,
      falseNegatives: topFns,
      coinFlipCount,
      leakSummary,
    };
    return { graded, scorecard };
  }, [selected, submitted, target, position]);

  if (submitted) {
    return (
      <div className="space-y-4">
        <RangeMatrix range={target} mode="drill" graded={graded} />
        <div className="flex gap-4 justify-center text-[10px] text-gold-light/40">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: 'rgba(34,197,94,0.55)' }} /> Correct open
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: 'rgba(178,34,52,0.6)' }} /> Shouldn&apos;t open
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: 'rgba(74,111,165,0.55)' }} /> Missed open
          </span>
        </div>
        <Scorecard data={scorecard} onRetry={reset} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gold-light/60 text-center">
        Tap every hand you would <span className="text-gold font-semibold">open</span> from{' '}
        <span className="text-gold font-semibold">{position}</span>. The board is blank — no
        peeking.
      </p>
      <RangeMatrix range={target} mode="drill" selected={selected} onCellTap={toggle} />
      <button
        onClick={() => {
          setSubmitted(true);
          logCoachEvent({
            kind: 'drill',
            position,
            picks: selected.size,
            accuracyPct: Math.round(scorecard.accuracy * 100),
            yourOpenPct: Math.round(scorecard.userPct),
            targetOpenPct: Math.round(scorecard.targetPct),
            overOpens: scorecard.falsePositives.map((f) => f.label),
            missedOpens: scorecard.falseNegatives.map((f) => f.label),
            leak: scorecard.leakSummary,
          });
        }}
        disabled={selected.size === 0}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-dark to-gold text-background font-bold text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-30"
      >
        Submit range ({selected.size} hands)
      </button>
    </div>
  );
}
