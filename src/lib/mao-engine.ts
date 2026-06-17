// LLM-powered rule engine for Mao AI

import { Card, canPlayBase } from "../lib/cards";
import { MaoRule, ValidationResult, Violation } from "../lib/types";

const RULE_COUNT = 6;

const RULE_EXAMPLES = [
  "A player who plays a 7 must draw one card immediately.",
  "Playing a 2 lets you play another card immediately.",
  "Playing a 4 skips the next player's turn (CPU skips their turn).",
  "You must salute when you play a King. If you forget, draw 2 cards.",
  "Playing an Ace lets you play another card immediately.",
  "Playing a Jack forces the next player to draw 2 cards.",
  "If you play a Queen, you must compliment the dealer.",
  "Red cards (hearts/diamonds) must be played on red, black on black.",
  "You must say 'Thank you' after drawing cards from the pile.",
  "Playing a 9 means the next card must be from the same suit.",
  "A 6 cancels the previous special card effect.",
  "If you play a card matching the previous card's rank exactly (not suit), draw a card.",
  "You must hold your cards with your non-dominant hand only.",
  "Playing an 8 means you must knock on the table twice.",
  "Face cards (J/Q/K) must be announced aloud.",
  "Playing a 3 means the next player must draw 3 cards.",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function deterministicSeed(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickNRules(count: number): MaoRule[] {
  // Deterministic-ish: pick a fresh seed per session
  const seed = Date.now();
  const shuffled = [...RULE_EXAMPLES]
    .map((r, i) => ({ r, i, sortKey: deterministicSeed(r + String(seed)) }))
    .sort((a, b) => a.sortKey - b.sortKey);

  return shuffled.slice(0, count).map((item, idx) => ({
    id: `rule-${idx + 1}`,
    description: item.r,
    hint: generateHint(item.r),
  }));
}

function generateHint(rule: string): string {
  if (rule.includes("7")) return "Some numbers carry a price...";
  if (rule.includes("2") && rule.includes("reverse")) return "A certain number changes the flow...";
  if (rule.includes("4")) return "A lucky number for some, unlucky for others...";
  if (rule.includes("Ace") || rule.includes("ace")) return "The top of the deck has power...";
  if (rule.includes("Jack")) return "The knave demands tribute...";
  if (rule.includes("Queen")) return "Royalty expects flattery...";
  if (rule.includes("King")) return "Bow to the crown...";
  if (rule.includes("8")) return "Lucky 8 needs a tap...";
  if (rule.includes("9")) return "The number of endings...";
  if (rule.includes("6")) return "The number of cancellation...";
  if (rule.includes("talking") || rule.includes("speak") || rule.includes("Thank")) return "The tongue can betray you...";
  if (rule.includes("salute") || rule.includes("compliment") || rule.includes("announce")) return "Etiquette matters at this table...";
  if (rule.includes("ascending")) return "Order is everything...";
  if (rule.includes("Red") || rule.includes("black")) return "Color has its place...";
  if (rule.includes("hold") || rule.includes("hand")) return "How you hold them matters...";
  if (rule.includes("matching") || rule.includes("exactly")) return "Sameness has a cost...";
  return "The rules are not what they seem...";
}

export function generateRules(): MaoRule[] {
  return pickNRules(RULE_COUNT);
}

export function validateMove(
  card: Card,
  playerHand: Card[],
  topCard: Card,
  rules: MaoRule[],
  by: "player" | "cpu",
  turnNumber: number,
  previousActions: string[]
): ValidationResult {
  const violations: Violation[] = [];

  // Check base rules (suit or rank match)
  const baseValid = canPlayBase(card, topCard);
  if (!baseValid) {
    return {
      baseValid: false,
      violations: [
        {
          ruleId: "base",
          ruleHint: card.rank === topCard.rank
            ? "Same rank is allowed."
            : "Card must match suit or rank.",
          description: `Played ${card.rank} of ${card.suit} — doesn't match ${topCard.rank} of ${topCard.suit}. Must match suit or rank.`,
          cardPlayed: card,
          by,
          turn: turnNumber,
        },
      ],
      gameOver: false,
    };
  }

  // Check hidden rules
  for (const rule of rules) {
    const violated = checkRuleViolated(card, topCard, rule, playerHand, previousActions);
    if (violated) {
      violations.push({
        ruleId: rule.id,
        ruleHint: rule.hint,
        description: rule.description,
        cardPlayed: card,
        by,
        turn: turnNumber,
      });
    }
  }

  return {
    baseValid: true,
    violations,
    gameOver: false,
  };
}

function checkRuleViolated(
  card: Card,
  topCard: Card,
  rule: MaoRule,
  hand: Card[],
  _previousActions: string[]
): boolean {
  const desc = rule.description;

  // Playing a 7 => draw one
  if (desc.includes("playing a 7") && card.rank === "7") return true;

  // 2 = play again
  if (desc.includes("2 lets you play another") && card.rank === "2") return true;

  // Playing a 4 skips
  if (desc.includes("4 skip") && card.rank === "4") return true;

  // King salute
  if (desc.includes("salute") && card.rank === "K") return true;

  // Ace = extra turn
  if (desc.includes("Ace") && card.rank === "A") return true;

  // Jack forces draw 2
  if (desc.includes("Jack") && desc.includes("draw 2") && card.rank === "J") return true;

  // Queen compliment
  if (desc.includes("Queen") && card.rank === "Q") return true;

  // Red on red, black on black
  if (desc.includes("Red") && desc.includes("black")) {
    const red = ["hearts", "diamonds"];
    const black = ["spades", "clubs"];
    const cardIsRed = red.includes(card.suit);
    const topIsRed = red.includes(topCard.suit);
    if (cardIsRed !== topIsRed) return true;
  }

  // 9 = same suit next
  if (desc.includes("9") && desc.includes("suit") && card.rank === "9") return true;

  // 6 cancels
  if (desc.includes("6 cancel") && card.rank === "6") return true;

  // 8 tap
  if (desc.includes("8") && card.rank === "8") return true;

  // Exact rank match penalty
  if (desc.includes("matching") && card.rank === topCard.rank) return true;

  // Thank you rule — triggers when drawing (not playing)
  if (desc.includes("Thank you")) {
    // This rule triggers when you draw, not when you play
    return false; // Handled by drawCard flow
  }

  // Hold cards with non-dominant hand
  if (desc.includes("hold") || desc.includes("hand") || desc.includes("non-dominant")) return true;

  // Face cards announced aloud
  if (desc.includes("Face cards") && (card.rank === "J" || card.rank === "Q" || card.rank === "K")) return true;

  // 3 = draw 3
  if (desc.includes("3") && card.rank === "3") return true;

  return false;
}

export function getCpuPlay(
  hand: Card[],
  topCard: Card,
  rules: MaoRule[],
  turnNumber: number
): { cardIndex: number } | null {
  // CPU knows the rules (to play reasonably) but occasionally "forgets" early on
  const forgetChance = Math.max(0.3, 1 - turnNumber * 0.02); // Gets better over time

  // Find playable cards (base rules)
  const playable = hand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => canPlayBase(card, topCard));

  if (playable.length === 0) return null; // Must draw

  // Try to find a card that doesn't violate hidden rules
  const safePlays = playable.filter(
    ({ card }) =>
      validateMove(card, hand, topCard, rules, "cpu", turnNumber, []).violations.length === 0
  );

  if (safePlays.length === 0) {
    // All plays violate something — pick the least bad one
    const pick = playable[Math.floor(Math.random() * playable.length)];
    // CPU might randomly "forget" and play a violating card anyway
    return { cardIndex: pick.idx };
  }

  // Play a safe card, but sometimes "forget"
  if (Math.random() < forgetChance) {
    const pick = safePlays[Math.floor(Math.random() * safePlays.length)];
    return { cardIndex: pick.idx };
  }

  // "Forget" and play a violating card
  const pick = playable[Math.floor(Math.random() * playable.length)];
  return { cardIndex: pick.idx };
}
