// Card engine for Mao AI

export type Suit = "spades" | "hearts" | "clubs" | "diamonds";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "7H" = 7 of hearts
}

const SUITS: Suit[] = ["spades", "hearts", "clubs", "diamonds"];
const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  clubs: "♣",
  diamonds: "♦",
};

export const SUIT_COLORS: Record<Suit, string> = {
  spades: "text-white",
  hearts: "text-red-400",
  clubs: "text-white",
  diamonds: "text-red-400",
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit[0].toUpperCase()}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[], count: number): Card[] {
  return deck.slice(0, count);
}

export function canPlayBase(card: Card, topCard: Card): boolean {
  return card.suit === topCard.suit || card.rank === topCard.rank;
}
