// Fire-and-forget client logger for the live coaching feed. Each call appends a
// line to coach-feed.jsonl (via /api/coach-feed) that the terminal coach reads.
// Never throws and never blocks the UI — failures are swallowed silently.
export function logCoachEvent(event: Record<string, unknown>): void {
  try {
    void fetch('/api/coach-feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
