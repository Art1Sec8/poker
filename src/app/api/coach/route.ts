import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { calculateEquity } from '@/engine/equity-calculator';
import { Card, GameVariant, Street, ActionType, ActionRecord } from '@/engine/types';

const client = new Anthropic();

interface CoachRequest {
  holeCards: Card[];
  board: Card[];
  position: string;
  pot: number;
  street: Street;
  actionHistory: ActionRecord[];
  playerChips: number;
  opponentCount: number;
  variant: GameVariant;
  currentBet: number;
  toCall: number;
  playerAction?: { type: ActionType; amount: number };
}

const SYSTEM_PROMPT = `You are an expert poker coach analyzing a hand in real-time. Provide concise, actionable advice.

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "recommendedAction": "fold" | "check" | "call" | "bet" | "raise" | "allin",
  "recommendedAmount": <number or 0>,
  "reasoning": "<2-3 sentences explaining why, referencing pot odds, position, hand strength>",
  "decisionQuality": "brilliant" | "solid" | "mistake" (only if playerAction is provided)
}

Consider:
- Position (early = tight, late = loose)
- Pot odds vs hand equity
- Board texture and draws
- Stack-to-pot ratio
- Street (preflop ranges, postflop hand reading)
- Opponent count (more opponents = tighter)`;

export async function POST(request: NextRequest) {
  try {
    const body: CoachRequest = await request.json();
    const { holeCards, board, variant, opponentCount } = body;

    // Quick equity calculation
    let equity = 0;
    if (holeCards.length > 0) {
      // Create a dummy opponent hand range (random cards)
      const opponentHands: Card[][] = [];
      for (let i = 0; i < Math.min(opponentCount, 3); i++) {
        opponentHands.push([]); // empty = random in calculator
      }
      try {
        const result = calculateEquity(
          [holeCards, ...opponentHands],
          board, variant, 1000,
        );
        equity = result.equities[0];
      } catch {
        equity = 0.5; // fallback
      }
    }

    const handDescription = describeHand(body);

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: handDescription,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch {
      analysis = {
        recommendedAction: 'check',
        recommendedAmount: 0,
        reasoning: text.slice(0, 200),
      };
    }

    return NextResponse.json({
      ...analysis,
      equity: Math.round(equity * 100),
    });
  } catch (error) {
    console.error('Coach API error:', error);
    return NextResponse.json(
      { error: 'Coach unavailable', reasoning: 'Could not analyze this hand.' },
      { status: 500 },
    );
  }
}

function describeHand(req: CoachRequest): string {
  const cardNames = (cards: Card[]): string =>
    cards.map(c => {
      const ranks = '23456789TJQKA';
      const suits = 'cdhs';
      return ranks[Math.floor(c / 4)] + suits[c % 4];
    }).join(' ');

  const parts: string[] = [
    `Game: ${req.variant === 'plo' ? 'Pot-Limit Omaha' : "No-Limit Hold'em"}`,
    `Position: ${req.position}`,
    `Street: ${req.street}`,
    `Hole cards: ${cardNames(req.holeCards)}`,
  ];

  if (req.board.length > 0) {
    parts.push(`Board: ${cardNames(req.board)}`);
  }

  parts.push(`Pot: $${req.pot}`);
  parts.push(`Your chips: $${req.playerChips}`);
  parts.push(`Opponents remaining: ${req.opponentCount}`);
  parts.push(`Amount to call: $${req.toCall}`);

  if (req.actionHistory.length > 0) {
    const recentActions = req.actionHistory.slice(-6).map(a =>
      `Player ${a.playerId} ${a.type}${a.amount > 0 ? ` $${a.amount}` : ''}`
    ).join(', ');
    parts.push(`Recent actions: ${recentActions}`);
  }

  if (req.playerAction) {
    parts.push(`\nThe player chose to: ${req.playerAction.type}${req.playerAction.amount > 0 ? ` $${req.playerAction.amount}` : ''}`);
    parts.push(`Evaluate the quality of this decision.`);
  } else {
    parts.push(`\nWhat should the player do?`);
  }

  return parts.join('\n');
}
