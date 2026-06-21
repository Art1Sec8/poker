'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildGrid, labelAt, regionAt, type Region } from '@/lib/range-trainer/grid';
import type { GradeResult } from '@/lib/range-trainer/grading';

const GRID = buildGrid();

const C = {
  paper: '#EDE6DA',
  muted: '#9A8E7D',
  hairline: '#352D24',
  green: '#5FA587',
  red: '#C8102E',
  gold: '#D9A441',
  ink: '#15120F',
};

type CellState = 'idle' | 'active' | 'correct' | 'tooLoose' | 'missed';

// Very subtle background tints just to delineate the three regions.
const REGION_TINT: Record<Region, string> = {
  pair: 'rgba(217, 164, 65, 0.06)',
  suited: 'rgba(95, 165, 135, 0.06)',
  offsuit: 'rgba(255, 255, 255, 0.015)',
};

interface Props {
  selected: Set<string>;
  onPaint: (hand: string, value: boolean) => void;
  graded: boolean;
  result: GradeResult | null;
  reducedMotion: boolean;
}

export default function HandGrid({ selected, onPaint, graded, result, reducedMotion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const painting = useRef(false);
  const paintValue = useRef(true);
  const [focus, setFocus] = useState({ i: 0, j: 0 });

  const sets = useMemo(() => {
    return {
      correct: new Set(result?.correct ?? []),
      tooLoose: new Set(result?.tooLoose ?? []),
      missed: new Set(result?.missed ?? []),
    };
  }, [result]);

  const cellState = useCallback(
    (hand: string): CellState => {
      if (graded && result) {
        if (sets.correct.has(hand)) return 'correct';
        if (sets.tooLoose.has(hand)) return 'tooLoose';
        if (sets.missed.has(hand)) return 'missed';
        return 'idle';
      }
      return selected.has(hand) ? 'active' : 'idle';
    },
    [graded, result, sets, selected],
  );

  // --- Paint gestures (mouse + touch unified via pointer + elementFromPoint) ---
  const handFromPoint = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    const cell = el?.closest('[data-hand]') as HTMLElement | null;
    return cell?.dataset.hand ?? null;
  };

  const startPaint = (hand: string) => {
    if (graded) return;
    const value = !selected.has(hand);
    paintValue.current = value;
    painting.current = true;
    onPaint(hand, value);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!painting.current) return;
      const hand = handFromPoint(e.clientX, e.clientY);
      if (hand) onPaint(hand, paintValue.current);
    };
    const up = () => {
      painting.current = false;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [onPaint]);

  // --- Keyboard navigation (roving tabindex) ---
  const focusCell = (i: number, j: number) => {
    setFocus({ i, j });
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-pos="${i}-${j}"]`);
    el?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number, j: number) => {
    let ni = i;
    let nj = j;
    switch (e.key) {
      case 'ArrowUp': ni = Math.max(0, i - 1); break;
      case 'ArrowDown': ni = Math.min(12, i + 1); break;
      case 'ArrowLeft': nj = Math.max(0, j - 1); break;
      case 'ArrowRight': nj = Math.min(12, j + 1); break;
      case 'Home': nj = 0; break;
      case 'End': nj = 12; break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        startPaint(GRID[i][j]);
        painting.current = false;
        return;
      default:
        return;
    }
    e.preventDefault();
    focusCell(ni, nj);
  };

  return (
    <div
      ref={containerRef}
      role="grid"
      aria-label="13 by 13 starting-hand grid"
      className="grid touch-none select-none gap-[2px]"
      style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
    >
      {GRID.map((rowHands, i) =>
        rowHands.map((hand, j) => {
          const state = cellState(hand);
          const region = regionAt(i, j);
          const label = labelAt(i, j);
          const isFocusTarget = focus.i === i && focus.j === j;

          let bg = REGION_TINT[region];
          let color = C.muted;
          let ring = 'transparent';
          let weight = 400;

          if (state === 'active') {
            bg = 'rgba(237, 230, 218, 0.16)';
            color = C.paper;
            ring = C.paper;
            weight = 700;
          } else if (state === 'correct') {
            bg = C.green; color = C.ink; weight = 700;
          } else if (state === 'tooLoose') {
            bg = C.red; color = '#FBE9EC'; weight = 700;
          } else if (state === 'missed') {
            bg = C.gold; color = C.ink; weight = 700;
          }

          const delay = !reducedMotion && graded ? `${(i + j) * 11}ms` : '0ms';

          return (
            <button
              key={hand}
              type="button"
              data-hand={hand}
              data-pos={`${i}-${j}`}
              role="gridcell"
              tabIndex={isFocusTarget ? 0 : -1}
              aria-label={`${hand}${state === 'active' ? ', selected' : ''}${
                graded ? `, ${state}` : ''
              }`}
              aria-selected={state === 'active'}
              onPointerDown={(e) => {
                (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
                startPaint(hand);
              }}
              onFocus={() => setFocus({ i, j })}
              onKeyDown={(e) => onKeyDown(e, i, j)}
              className="flex aspect-square items-center justify-center rounded-[3px] text-[1.65vw] leading-none outline-none focus-visible:ring-2 focus-visible:ring-offset-1 sm:text-[10px]"
              style={{
                backgroundColor: bg,
                color,
                fontFamily: "'Space Mono', ui-monospace, monospace",
                fontWeight: weight,
                boxShadow: ring === 'transparent' ? 'none' : `inset 0 0 0 1.5px ${ring}`,
                transition: reducedMotion
                  ? 'none'
                  : 'background-color 240ms ease, color 240ms ease, box-shadow 120ms ease, transform 120ms ease',
                transitionDelay: delay,
                // a touch of breathing room on the reveal
                transform: 'translateZ(0)',
                // keyboard focus ring color
                ['--tw-ring-color' as string]: C.gold,
              }}
            >
              {label}
            </button>
          );
        }),
      )}
    </div>
  );
}
