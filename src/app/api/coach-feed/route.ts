import { NextRequest, NextResponse } from 'next/server';
import { appendFile, readFile } from 'fs/promises';
import path from 'path';

// Node runtime so we can write to the local filesystem (Edge has no fs).
export const runtime = 'nodejs';

const FEED_PATH = path.join(process.cwd(), 'coach-feed.jsonl');

// The Range Academy POSTs a coaching event here; we append it as one JSON line.
// A human coach (Claude Code in the terminal) tails coach-feed.jsonl to react to
// the live session — which hands were explored, how a drill scored, etc.
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
    await appendFile(FEED_PATH, line, 'utf8');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('coach-feed POST error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// Convenience reader (last N lines) so the feed can also be fetched over HTTP.
export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? '40');
    const raw = await readFile(FEED_PATH, 'utf8').catch(() => '');
    const lines = raw.split('\n').filter(Boolean).slice(-limit);
    return NextResponse.json({ events: lines.map((l) => JSON.parse(l)) });
  } catch (error) {
    console.error('coach-feed GET error:', error);
    return NextResponse.json({ events: [] }, { status: 500 });
  }
}
