'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CoachAnalysis } from '@/engine/types';

interface CoachPanelProps {
  enabled: boolean;
  onToggle: () => void;
  analysis: (CoachAnalysis & { equity: number }) | null;
  isLoading: boolean;
  showReview: boolean;
}

export function CoachPanel({ enabled, onToggle, analysis, isLoading, showReview }: CoachPanelProps) {
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={`fixed top-4 left-4 z-40 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          enabled ? 'bg-gold/20 ring-1 ring-gold/40 text-gold' : 'glass text-gold/40 hover:text-gold/60'
        }`}
        title={enabled ? 'Disable Coach' : 'Enable Coach'}
      >
        <span className="text-sm">🎓</span>
      </button>

      {/* Live advice panel */}
      <AnimatePresence>
        {enabled && !showReview && (analysis || isLoading) && (
          <motion.div
            initial={{ opacity: 0, x: -200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -200 }}
            className="fixed top-14 left-4 z-40 w-64 glass rounded-xl p-3"
          >
            <div className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
              <span>🎓</span> AI Coach
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <div className="h-3 bg-gold/10 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gold/10 rounded animate-pulse w-full" />
                <div className="h-3 bg-gold/10 rounded animate-pulse w-2/3" />
              </div>
            ) : analysis ? (
              <div>
                {/* Recommended action */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${actionColor(analysis.recommendedAction)}`}>
                    {analysis.recommendedAction}
                    {analysis.recommendedAmount ? ` $${analysis.recommendedAmount}` : ''}
                  </span>
                  <span className="text-[10px] text-gold/50">
                    Equity: {analysis.equity}%
                  </span>
                </div>

                {/* Reasoning */}
                <p className="text-[11px] text-gold-light/60 leading-relaxed">
                  {analysis.reasoning}
                </p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}

interface CoachHandReviewProps {
  enabled: boolean;
  handReview: (CoachAnalysis & { equity: number; playerAction: string })[];
  showReview: boolean;
}

/**
 * Post-hand review block. Rendered in normal document flow at the intended
 * location (between the hand-complete overlay and the controls) rather than
 * at the top of the page where CoachPanel itself is mounted.
 */
export function CoachHandReview({ enabled, handReview, showReview }: CoachHandReviewProps) {
  return (
    <AnimatePresence>
      {enabled && showReview && handReview.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mx-4 mb-2"
        >
          <div className="glass rounded-xl p-3">
            <div className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-2">
              🎓 Hand Review
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {handReview.map((review, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <QualityBadge quality={review.decisionQuality} />
                  <div>
                    <span className="text-gold-light/80 font-semibold">
                      You: {review.playerAction}
                    </span>
                    {review.recommendedAction !== review.playerAction.split(' ')[0] && (
                      <span className="text-gold/50 ml-1">
                        (suggested: {review.recommendedAction})
                      </span>
                    )}
                    <p className="text-gold-light/40 mt-0.5">{review.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function QualityBadge({ quality }: { quality?: 'brilliant' | 'solid' | 'mistake' }) {
  if (!quality) return null;
  const styles = {
    brilliant: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30',
    solid: 'bg-blue-900/40 text-blue-300 border-blue-500/30',
    mistake: 'bg-red-900/40 text-red-300 border-red-500/30',
  };
  const icons = { brilliant: '✨', solid: '✓', mistake: '✗' };

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${styles[quality]}`}
    >
      {icons[quality]}
    </motion.span>
  );
}

function actionColor(action: string): string {
  switch (action) {
    case 'fold': return 'bg-red-900/40 text-red-300';
    case 'check': return 'bg-steel/30 text-blue-300';
    case 'call': return 'bg-steel/30 text-blue-300';
    case 'bet':
    case 'raise': return 'bg-gold/20 text-gold';
    case 'allin': return 'bg-gold/30 text-gold';
    default: return 'bg-gold/10 text-gold/60';
  }
}
