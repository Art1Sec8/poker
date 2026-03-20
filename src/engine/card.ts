import { Card, Rank, Suit } from './types';

// ============================================================
// Card encoding: card = rank * 4 + suit (0-51)
// Rank: 2=0, 3=1, 4=2, 5=3, 6=4, 7=5, 8=6, 9=7, T=8, J=9, Q=10, K=11, A=12
// Suit: c=0, d=1, h=2, s=3
// ============================================================

const RANK_CHARS = '23456789TJQKA';
const SUIT_CHARS = 'cdhs';
const SUIT_SYMBOLS: Record<number, string> = { 0: '♣', 1: '♦', 2: '♥', 3: '♠' };
const SUIT_NAMES: Record<number, string> = { 0: 'clubs', 1: 'diamonds', 2: 'hearts', 3: 'spades' };
const RANK_NAMES = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];

export function makeCard(rank: Rank, suit: Suit): Card {
  return rank * 4 + suit;
}

export function cardRank(card: Card): Rank {
  return Math.floor(card / 4) as Rank;
}

export function cardSuit(card: Card): Suit {
  return (card % 4) as Suit;
}

export function cardToString(card: Card): string {
  return RANK_CHARS[cardRank(card)] + SUIT_CHARS[cardSuit(card)];
}

export function cardToDisplay(card: Card): { rank: string; suit: string; suitSymbol: string; isRed: boolean } {
  const r = cardRank(card);
  const s = cardSuit(card);
  return {
    rank: r === 8 ? '10' : RANK_CHARS[r],
    suit: SUIT_NAMES[s],
    suitSymbol: SUIT_SYMBOLS[s],
    isRed: s === 1 || s === 2, // diamonds or hearts
  };
}

export function parseCard(str: string): Card {
  const rankIdx = RANK_CHARS.indexOf(str[0].toUpperCase());
  const suitIdx = SUIT_CHARS.indexOf(str[1].toLowerCase());
  if (rankIdx === -1 || suitIdx === -1) throw new Error(`Invalid card: ${str}`);
  return makeCard(rankIdx as Rank, suitIdx as Suit);
}

export function parseCards(str: string): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < str.length; i += 2) {
    cards.push(parseCard(str.substring(i, i + 2)));
  }
  return cards;
}

export function cardsToString(cards: Card[]): string {
  return cards.map(cardToString).join('');
}

export function rankName(rank: Rank): string {
  return RANK_NAMES[rank];
}

export function suitName(suit: Suit): string {
  return SUIT_NAMES[suit];
}

/** Check if suit is red (hearts/diamonds) */
export function isRedSuit(suit: Suit): boolean {
  return suit === 1 || suit === 2;
}
