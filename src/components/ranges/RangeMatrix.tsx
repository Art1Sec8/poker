'use client';

import { motion } from 'framer-motion';
import { getRangeLabel, isRangeSuited } from '@/data/ranges/holdem/ranges';

export type MatrixMode = 'explore' | 'learn' | 'drill';
export type GradeResult = 'tp' | 'fp' | 'fn';

interface RangeMatrixProps {
  range: number[][];
  mode: MatrixMode;
  /** drill: cells the user has selected as opens. key = `${row}-${col}` */
  selected?: Set<string>;
  onCellTap?: (row: number, col: number) => void;
  /** learn: cells returning false are dimmed */
  highlightRegion?: (row: number, col: number) => boolean;
  /** drill result coloring. key = `${row}-${col}` */
  graded?: Map<string, GradeResult>;
}

// Color bands — identical thresholds to the original grid.
function freqColor(freq: number): string {
  if (freq <= 0) return 'rgba(255,255,255,0.03)';
  const rgb = freq > 0.7 ? '34,197,94' : freq > 0.3 ? '234,179,8' : '239,68,68';
  return `rgba(${rgb}, ${0.15 + freq * 0.5})`;
}

const GRADE_COLOR: Record<GradeResult, string> = {
  tp: 'rgba(34,197,94,0.55)', // true positive — emerald
  fp: 'rgba(178,34,52,0.6)', // false positive — crimson
  fn: 'rgba(74,111,165,0.55)', // false negative — steel
};

export function RangeMatrix({
  range,
  mode,
  selected,
  onCellTap,
  highlightRegion,
  graded,
}: RangeMatrixProps) {
  return (
    <div className="glass rounded-xl p-2" style={{ containerType: 'inline-size' }}>
      <div
        className="grid gap-0.5 w-full"
        style={{ gridTemplateColumns: 'repeat(13, 1fr)' }}
      >
        {Array.from({ length: 13 }, (_, row) =>
          Array.from({ length: 13 }, (_, col) => {
            const key = `${row}-${col}`;
            const freq = range[row][col];
            const label = getRangeLabel(row, col);
            const grade = graded?.get(key);
            const isSelected = selected?.has(key);
            const dimmed = highlightRegion ? !highlightRegion(row, col) : false;
            const tappable = !!onCellTap;

            // In an ungraded drill the learner must NOT be able to read which
            // hands are in range — not off the background, the text, or the tooltip.
            const drillHidden = mode === 'drill' && !grade;

            let background: string;
            if (grade) {
              background = GRADE_COLOR[grade];
            } else if (mode === 'drill') {
              // Neutral board so the learner can't read the answer off the colors.
              background = isSelected
                ? 'rgba(201,168,76,0.55)'
                : 'rgba(255,255,255,0.05)';
            } else {
              background = freqColor(freq);
            }

            let textColor: string;
            if (dimmed) {
              textColor = 'rgba(255,255,255,0.15)';
            } else if (drillHidden) {
              // Uniform: selected cells get dark text on gold, everything else the
              // same mid-grey — freq must not change the brightness here.
              textColor = isSelected ? 'rgba(13,13,13,0.95)' : 'rgba(255,255,255,0.55)';
            } else if (freq > 0 || grade || isSelected) {
              textColor = 'rgba(255,255,255,0.85)';
            } else {
              textColor = 'rgba(255,255,255,0.25)';
            }

            return (
              <motion.div
                key={key}
                whileHover={tappable ? { scale: 1.1 } : undefined}
                onClick={tappable ? () => onCellTap!(row, col) : undefined}
                className={`aspect-square flex items-center justify-center rounded font-bold transition-all ${
                  tappable ? 'cursor-pointer' : 'cursor-default'
                } ${isSelected && mode === 'drill' ? 'ring-1 ring-gold' : ''}`}
                style={{
                  // Font scales with the grid's own width (container units), so
                  // every mode renders identically and nothing ever overflows.
                  fontSize: 'clamp(9px, 3cqw, 20px)',
                  backgroundColor: background,
                  color: textColor,
                  opacity: dimmed ? 0.25 : 1,
                }}
                title={drillHidden ? label : `${label}: ${(freq * 100).toFixed(0)}%`}
              >
                {label}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
