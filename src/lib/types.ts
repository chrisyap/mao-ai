// Game types for Mao AI

import { Card } from "./cards";

export interface MaoRule {
  id: string;
  description: string; // The hidden rule (never shown to player until discovered)
  hint: string; // A cryptic hint after a violation
}

export interface GameState {
  playerHand: Card[];
  cpuHand: Card[];
  cpuHandCount: number; // CPU hand visible only by count
  discardPile: Card[];
  drawPile: Card[];
  currentTurn: "player" | "cpu";
  rules: MaoRule[];
  violations: Violation[];
  winner: "player" | "cpu" | null;
  playerPenalties: number;
  cpuPenalties: number;
  gameStarted: boolean;
  turnNumber: number;
}

export interface Violation {
  ruleId: string;
  ruleHint: string;
  description: string;
  cardPlayed: Card | null;
  by: "player" | "cpu";
  turn: number;
}

export interface ValidationResult {
  baseValid: boolean;
  violations: Violation[];
  gameOver: boolean;
  explanation?: string;
}

export interface CpuMoveResult {
  cardIndex: number | null; // null = draw
  card?: Card;
}
