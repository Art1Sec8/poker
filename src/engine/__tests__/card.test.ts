import { describe, it, expect } from 'vitest';
import { makeCard, cardRank, cardSuit, cardToString, parseCard, parseCards, cardsToString, cardToDisplay } from '../card';

describe('card encoding', () => {
  it('encodes card as rank * 4 + suit', () => {
    // 2c = rank 0, suit 0 = 0
    expect(makeCard(0, 0)).toBe(0);
    // As = rank 12, suit 3 = 51
    expect(makeCard(12, 3)).toBe(51);
    // Th = rank 8, suit 2 = 34
    expect(makeCard(8, 2)).toBe(34);
  });

  it('extracts rank from card', () => {
    expect(cardRank(0)).toBe(0);   // 2c
    expect(cardRank(51)).toBe(12); // As
    expect(cardRank(34)).toBe(8);  // Th
  });

  it('extracts suit from card', () => {
    expect(cardSuit(0)).toBe(0);   // clubs
    expect(cardSuit(51)).toBe(3);  // spades
    expect(cardSuit(34)).toBe(2);  // hearts
  });

  it('converts card to string', () => {
    expect(cardToString(makeCard(12, 3))).toBe('As');
    expect(cardToString(makeCard(11, 2))).toBe('Kh');
    expect(cardToString(makeCard(0, 0))).toBe('2c');
    expect(cardToString(makeCard(8, 1))).toBe('Td');
  });

  it('parses card from string', () => {
    expect(parseCard('As')).toBe(makeCard(12, 3));
    expect(parseCard('Kh')).toBe(makeCard(11, 2));
    expect(parseCard('2c')).toBe(makeCard(0, 0));
    expect(parseCard('Td')).toBe(makeCard(8, 1));
  });

  it('throws on invalid card string', () => {
    expect(() => parseCard('Xx')).toThrow('Invalid card');
    expect(() => parseCard('1c')).toThrow('Invalid card');
  });

  it('parses multiple cards', () => {
    const cards = parseCards('AhKh');
    expect(cards).toHaveLength(2);
    expect(cardToString(cards[0])).toBe('Ah');
    expect(cardToString(cards[1])).toBe('Kh');
  });

  it('round-trips cards through string conversion', () => {
    for (let c = 0; c < 52; c++) {
      const str = cardToString(c);
      expect(parseCard(str)).toBe(c);
    }
  });

  it('displays card with suit symbol and red flag', () => {
    const display = cardToDisplay(makeCard(12, 2)); // Ah
    expect(display.rank).toBe('A');
    expect(display.suitSymbol).toBe('♥');
    expect(display.isRed).toBe(true);

    const spade = cardToDisplay(makeCard(11, 3)); // Ks
    expect(spade.isRed).toBe(false);
  });
});
