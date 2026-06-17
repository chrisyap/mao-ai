"use client";

import { useCallback, useEffect, useState } from "react";

import {
  canPlayBase,
  Card,
  createDeck,
  dealCards,
  shuffleDeck,
} from "@/lib/cards";
import { getCpuPlay, validateMove } from "@/lib/mao-engine";
import { GameState, MaoRule } from "@/lib/types";

import { CardView } from "./card-view";

const INITIAL_HAND_SIZE = 7;

function newGame(): GameState {
  const deck = shuffleDeck(createDeck());
  const playerHand = dealCards(deck, INITIAL_HAND_SIZE);
  const cpuHand = dealCards(deck.slice(INITIAL_HAND_SIZE), INITIAL_HAND_SIZE);
  const drawPile = deck.slice(INITIAL_HAND_SIZE * 2);
  const firstCard = drawPile.pop()!;
  // Rules are generated async via API call, use placeholders for now
  const rules: MaoRule[] = [];

  return {
    playerHand,
    cpuHand,
    cpuHandCount: cpuHand.length,
    discardPile: [firstCard],
    drawPile,
    currentTurn: Math.random() < 0.5 ? "player" : "cpu",
    rules,
    violations: [],
    winner: null,
    playerPenalties: 0,
    cpuPenalties: 0,
    gameStarted: true,
    turnNumber: 1,
  };
}

export function MaoGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");
  const [gameOverMsg, setGameOverMsg] = useState<string>("");
  const [showRules, setShowRules] = useState(false);
  const [violationFlash, setViolationFlash] = useState<{
    hint: string;
    by: "player" | "cpu";
  } | null>(null);
  const [cardPlayed, setCardPlayed] = useState<{
    card: Card;
    by: "player" | "cpu";
  } | null>(null);

  const MAX_TURNS = 100;

  // CPU takes its turn automatically
  useEffect(() => {
    if (game && game.currentTurn === "cpu" && !game.winner) {
      const timer = setTimeout(() => {
        doCpuTurn();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [game]);

  const doCpuTurn = useCallback(() => {
    setGame((prev) => {
      if (!prev || prev.winner || prev.currentTurn !== "cpu") return prev;

      const g = { ...prev };
      g.cpuHand = [...g.cpuHand];
      g.drawPile = [...g.drawPile];
      g.discardPile = [...g.discardPile];
      g.violations = [...g.violations];

      const topCard = g.discardPile[g.discardPile.length - 1];
      const play = getCpuPlay(g.cpuHand, topCard, g.rules, g.turnNumber);

      if (!play) {
        // CPU draws
        if (g.drawPile.length === 0) recycleDiscard(g);
        const drawn = g.drawPile.pop()!;
        g.cpuHand.push(drawn);
        g.cpuHandCount = g.cpuHand.length;
        setMessage(`CPU drew a card (${g.cpuHand.length} left)`);
      } else {
        const card = g.cpuHand[play.cardIndex];
        const validation = validateMove(
          card,
          g.cpuHand,
          topCard,
          g.rules,
          "cpu",
          g.turnNumber,
          [],
        );

        g.cpuHand.splice(play.cardIndex, 1);
        g.cpuHandCount = g.cpuHand.length;
        g.discardPile.push(card);
        setCardPlayed({ card, by: "cpu" });

        if (validation.violations.length > 0) {
          g.cpuPenalties += 1;
          g.violations.push(validation.violations[0]);
          setViolationFlash({
            hint: validation.violations[0].ruleHint,
            by: "cpu",
          });
          if (g.drawPile.length === 0) recycleDiscard(g);
          g.cpuHand.push(g.drawPile.pop()!);
          g.cpuHandCount = g.cpuHand.length;
        }

        setMessage(
          `CPU played ${card.rank}${suitSym(card.suit)} (${g.cpuHand.length} left)`,
        );
      }

      // Check win
      if (g.turnNumber >= 100) {
        g.winner = g.playerHand.length <= g.cpuHand.length ? "player" : "cpu";
        setGameOverMsg(g.playerHand.length <= g.cpuHand.length ? "🏆 You win on cards!" : "😤 CPU wins on cards!");
        return g;
      }
      if (g.playerHand.length === 0) {
        g.winner = "player";
        setGameOverMsg("🎉 You won!");
        return g;
      }
      if (g.cpuHand.length === 0) {
        g.winner = "cpu";
        setGameOverMsg("😤 CPU wins!");
        return g;
      }

      g.turnNumber += 1;
      g.currentTurn = "player";
      return g;
    });
  }, []);

  const handlePlayCard = useCallback(() => {
    setGame((prev) => {
      if (!prev || prev.currentTurn !== "player" || selectedCard === null)
        return prev;

      const g = { ...prev };
      g.playerHand = [...g.playerHand];
      g.drawPile = [...g.drawPile];
      g.discardPile = [...g.discardPile];
      g.violations = [...g.violations];

      const card = g.playerHand[selectedCard];
      const topCard = g.discardPile[g.discardPile.length - 1];
      const validation = validateMove(
        card,
        g.playerHand,
        topCard,
        g.rules,
        "player",
        g.turnNumber,
        [],
      );

      if (!validation.baseValid) {
        setViolationFlash({
          hint: "Card must match suit or rank",
          by: "player",
        });
        setMessage("❌ Doesn't match the discard pile!");
        setSelectedCard(null);
        return prev;
      }

      // Play card
      g.playerHand.splice(selectedCard, 1);
      g.discardPile.push(card);
      setCardPlayed({ card, by: "player" });

      // Check hidden violations
      if (validation.violations.length > 0) {
        g.playerPenalties += 1;
        g.violations.push(validation.violations[0]);
        setViolationFlash({
          hint: validation.violations[0].ruleHint,
          by: "player",
        });
        if (g.drawPile.length === 0) recycleDiscard(g);
        g.playerHand.push(g.drawPile.pop()!);
      }

      setSelectedCard(null);
      setMessage(
        `You played ${card.rank}${suitSym(card.suit)}` +
          (validation.violations.length > 0 ? " ⚠️ Rule broken!" : " ✓"),
      );

      if (g.playerHand.length === 0) {
        g.winner = "player";
        setGameOverMsg("🎉 You won!");
        return g;
      }
      if (g.cpuHand.length === 0) {
        g.winner = "cpu";
        setGameOverMsg("😤 CPU wins!");
        return g;
      }

      g.turnNumber += 1;
      g.currentTurn = "cpu";
      return g;
    });
  }, [selectedCard]);

  const handleDrawCard = useCallback(() => {
    setGame((prev) => {
      if (!prev || prev.currentTurn !== "player") return prev;
      const g = { ...prev };
      g.playerHand = [...g.playerHand];
      g.drawPile = [...g.drawPile];
      g.discardPile = [...g.discardPile];

      if (g.drawPile.length === 0) recycleDiscard(g);
      const drawn = g.drawPile.pop()!;
      g.playerHand.push(drawn);
      setMessage(`You drew: ${drawn.rank}${suitSym(drawn.suit)}`);
      setSelectedCard(null);

      if (g.cpuHand.length === 0) {
        g.winner = "cpu";
        setGameOverMsg("😤 CPU wins!");
        return g;
      }
      g.turnNumber += 1;
      g.currentTurn = "cpu";
      return g;
    });
  }, []);

  const startGame = useCallback(async () => {
    const g = newGame();
    // Fetch rules from API (DeepSeek or fallback)
    try {
      const res = await fetch("/api/generate-rules", { method: "POST" });
      const data = await res.json();
      if (data.rules && data.rules.length === 6) {
        g.rules = data.rules.map((desc: string, i: number) => ({
          id: `rule-${i + 1}`,
          description: desc,
          hint: generateHint(desc),
        }));
        if (data.source === "deepseek") {
          setMessage("🤖 Rules generated by AI — good luck!");
        }
      }
    } catch {
      // Fallback rules
      g.rules = generateFallbackRules();
    }
    if (g.rules.length === 0) {
      g.rules = generateFallbackRules();
    }
    setGame(g);
    setMessage("");
    setGameOverMsg("");
    setViolationFlash(null);
    setCardPlayed(null);
    setShowRules(false);
  }, []);

  // Clear violation flash after timeout
  useEffect(() => {
    if (violationFlash) {
      const t = setTimeout(() => setViolationFlash(null), 2000);
      return () => clearTimeout(t);
    }
  }, [violationFlash]);

  // Clear card play flash after timeout
  useEffect(() => {
    if (cardPlayed) {
      const t = setTimeout(() => setCardPlayed(null), 600);
      return () => clearTimeout(t);
    }
  }, [cardPlayed]);

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 flex items-center justify-center">
        <div className="text-center space-y-8 px-6">
          <div className="text-7xl animate-bounce">🃏</div>
          <h1 className="text-6xl font-black tracking-tight text-white">
            <span className="text-purple-400">Mao</span>
          </h1>
          <p className="text-white/60 max-w-md mx-auto text-sm leading-relaxed">
            The card game where{" "}
            <span className="text-purple-300 font-semibold">
              nobody tells you the rules
            </span>
            . An AI creates hidden rules. You discover them by breaking them.
            First to empty their hand wins.
          </p>
          <button
            onClick={startGame}
            className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-8 font-bold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 active:scale-95"
          >
            🃏 Start Game
          </button>
        </div>
      </div>
    );
  }

  const topCard = game.discardPile[game.discardPile.length - 1];
  const canPlay =
    selectedCard !== null &&
    canPlayBase(game.playerHand[selectedCard], topCard);
  const isPlayerTurn = game.currentTurn === "player" && !game.winner;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/15 to-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex  max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🃏</span>
            <span className=" font-bold">
              <span className="text-purple-400">Mao</span> AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs text-white/70 uppercase tracking-wider">
                Turn {game.turnNumber}
              </span>
            </div>
            <button
              onClick={() => setShowRules(!showRules)}
              className="text-xs text-white/70 hover:text-white/60 transition-colors uppercase tracking-wider"
            >
              {showRules ? "Hide" : "Show"} Rules
            </button>
            <button
              onClick={startGame}
              className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white/80 transition-all border border-white/5"
            >
              New
            </button>
          </div>
        </div>
      </header>

      {/* Hidden rules panel */}
      {showRules && (
        <div className="bg-purple-950/30 border-b border-purple-500/10">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <p className="text-xs text-purple-400/50 uppercase tracking-wider mb-2 font-semibold">
              ⚡ Hidden Rules (spoiler)
            </p>
            <div className="grid gap-1.5">
              {game.rules.map((r) => (
                <div
                  key={r.id}
                  className="text-sm text-purple-300/60 font-mono"
                >
                  {r.description}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Violation flash banner */}
      {violationFlash && (
        <div className="border-b border-red-500/20 bg-red-950/30 animate-in slide-in-from-top">
          <div className="mx-auto max-w-4xl px-4 py-2 text-center">
            <span className="text-red-400 text-xs font-bold mr-2">
              🚨 RULE BROKEN
            </span>
            <span className="text-red-300/70 text-xs italic">
              &ldquo;{violationFlash.hint}&rdquo;
            </span>
          </div>
        </div>
      )}

      {/* Game over banner */}
      {game.winner && (
        <div className="bg-gradient-to-r from-purple-900/40 via-purple-800/30 to-purple-900/40 border-b border-purple-500/20">
          <div className="mx-auto max-w-4xl px-4 py-6 text-center">
            <p className="text-2xl font-black mb-1">{gameOverMsg}</p>
            <p className="text-sm text-white/60 mb-3">
              You broke {game.playerPenalties} rules &middot; CPU broke{" "}
              {game.cpuPenalties} rules
            </p>
            <button
              onClick={startGame}
              className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2 text-sm font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      )}

      {/* Main game area */}
      <div className="flex-1 mx-auto max-w-4xl w-full px-4 py-4 flex flex-col gap-3">
        {/* CPU area */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="flex -space-x-3">
              {Array.from({ length: Math.min(game.cpuHandCount, 9) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="w-7 h-10 rounded-lg border border-white/5 bg-gradient-to-b from-purple-900/30 to-indigo-900/20 flex items-center justify-center"
                  >
                    <span className="text-[9px] text-white/60">♠</span>
                  </div>
                ),
              )}
              {game.cpuHandCount > 9 && (
                <div className="w-7 h-10 rounded-lg border border-white/5 bg-white/5 flex items-center justify-center text-[9px] text-white/70">
                  +{game.cpuHandCount - 9}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-white/60">🤖 CPU</span>
            <span className="text-sm text-white/60">({game.cpuHandCount})</span>
            {game.currentTurn === "cpu" && !game.winner && (
              <span className="text-sm text-purple-400 animate-pulse">
                thinking...
              </span>
            )}
          </div>
        </div>

        {/* Discard pile */}
        <div className="flex items-center justify-center gap-4 py-3">
          {/* Draw pile */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-20 rounded-xl border border-white/10 bg-gradient-to-br from-purple-900/20 to-indigo-900/10 flex items-center justify-center shadow-inner">
              <span className="text-2xl leading-none text-white/60">🂠</span>
            </div>
            <span className="text-xs text-white/60">
              {game.drawPile.length}
            </span>
          </div>

          {/* Arrow */}
          <div className="text-white/60 text-sm">→</div>

          {/* Discard pile top card */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative">
              {/* Stacked shadows */}
              <div className="absolute -top-0.5 left-0.5 w-14 h-20 rounded-xl bg-purple-500/5" />
              <div className="absolute top-0.5 -left-0.5 w-14 h-20 rounded-xl bg-indigo-500/5" />
              <CardView card={topCard} faceUp />
            </div>
            <span className="text-sm text-white/60">Discard</span>
          </div>
        </div>

        {/* Status message */}
        {message && (
          <div className="text-center">
            <p
              className={`text-sm transition-all duration-300 ${
                message.includes("⚠️") || message.includes("❌")
                  ? "text-red-400/70"
                  : "text-white/60"
              }`}
            >
              {message}
            </p>
          </div>
        )}

        {/* Player hand */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap py-1">
          {game.playerHand.map((card, idx) => (
            <button
              key={`${card.id}-${idx}`}
              onClick={() => {
                if (!isPlayerTurn) return;
                setViolationFlash(null);
                setSelectedCard(idx === selectedCard ? null : idx);
              }}
              className={`transition-all duration-150 ${
                !isPlayerTurn ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              <CardView card={card} faceUp selected={selectedCard === idx} />
            </button>
          ))}
        </div>

        {/* Action buttons */}
        {isPlayerTurn && (
          <div className="flex items-center justify-center gap-3 mt-1">
            {canPlay ? (
              <button
                onClick={handlePlayCard}
                className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-7 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-purple-500/25 active:scale-95"
              >
                ▶ Play Card
              </button>
            ) : selectedCard !== null ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDrawCard}
                  className="rounded-full bg-white/5 border border-white/10 px-5 py-2 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white/80 transition-all active:scale-95"
                >
                  📥 Draw Instead
                </button>
                <p className="text-sm text-red-400/50">Doesn&apos;t match</p>
              </div>
            ) : (
              <button
                onClick={handleDrawCard}
                className="rounded-full bg-white/5 border border-white/10 px-7 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white/80 transition-all active:scale-95"
              >
                📥 Draw a Card
              </button>
            )}
          </div>
        )}

        {/* Rule discovery log */}
        {game.violations.length > 0 && (
          <div className="mt-auto pt-3">
            <div className="rounded-xl border border-white/5 bg-white/[0.015] p-3">
              <p className="text-xs text-white/20 uppercase tracking-wider mb-2 font-semibold">
                ⚡ Discoveries ({game.violations.length})
              </p>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {[...game.violations]
                  .reverse()
                  .slice(0, 8)
                  .map((v, i) => (
                    <div
                      key={`${v.turn}-${i}`}
                      className={`text-sm leading-relaxed rounded-lg px-2.5 py-1 ${
                        v.by === "player"
                          ? "bg-red-500/5 border-l-2 border-red-500/20"
                          : "bg-purple-500/5 border-l-2 border-purple-500/20"
                      }`}
                    >
                      <span className="text-white/70 text-xs mr-1.5">
                        #{v.turn}
                      </span>
                      <span
                        className={
                          v.by === "player"
                            ? "text-red-300/60"
                            : "text-purple-300/60"
                        }
                      >
                        {v.by === "player" ? "You" : "CPU"}
                      </span>
                      <span className="text-white/70 mx-1">→</span>
                      <span className="text-white/60 italic">
                        &ldquo;{v.ruleHint}&rdquo;
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Penalty counter */}
        <div className="text-center text-xs text-white/50 pb-2">
          You: {game.playerPenalties} 🚫 &middot; CPU: {game.cpuPenalties} 🚫
        </div>
      </div>
    </div>
  );
}

function suitSym(suit: string): string {
  const m: Record<string, string> = {
    spades: "♠",
    hearts: "♥",
    clubs: "♣",
    diamonds: "♦",
  };
  return m[suit] || "";
}

function recycleDiscard(g: GameState) {
  const top = g.discardPile[g.discardPile.length - 1];
  const rest = g.discardPile.slice(0, -1);
  const shuffled = shuffleDeck(rest);
  g.discardPile = [top];
  g.drawPile = shuffled;
}

const FALLBACK_RULES = [
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
  "Playing an 8 means you must knock on the table twice.",
  "Face cards (J/Q/K) must be announced aloud.",
  "Playing a 3 means the next player must draw 3 cards.",
];

function generateFallbackRules(): MaoRule[] {
  const shuffled = [...FALLBACK_RULES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6).map((desc, i) => ({
    id: `rule-${i + 1}`,
    description: desc,
    hint: generateHint(desc),
  }));
}

function generateHint(rule: string): string {
  if (rule.includes("7")) return "Some numbers carry a price...";
  if (rule.includes("2")) return "A certain number changes the flow...";
  if (rule.includes("4")) return "A lucky number for some...";
  if (rule.includes("Ace") || rule.includes("ace")) return "The top of the deck has power...";
  if (rule.includes("Jack")) return "The knave demands tribute...";
  if (rule.includes("Queen")) return "Royalty expects flattery...";
  if (rule.includes("King")) return "Bow to the crown...";
  if (rule.includes("8")) return "Lucky 8 needs a tap...";
  if (rule.includes("9")) return "The number of endings...";
  if (rule.includes("6")) return "The number of cancellation...";
  if (rule.includes("Thank")) return "Gratitude is required...";
  if (rule.includes("Red") || rule.includes("black")) return "Color has its place...";
  if (rule.includes("hold") || rule.includes("hand")) return "How you hold them matters...";
  if (rule.includes("matching") || rule.includes("exactly")) return "Sameness has a cost...";
  if (rule.includes("knock")) return "A knock echoes through the table...";
  if (rule.includes("announce") || rule.includes("aloud")) return "Silence is not golden...";
  if (rule.includes("Face") || rule.includes("J/Q/K")) return "The court demands recognition...";
  if (rule.includes("3")) return "Third time's a charm...";
  return "The rules are not what they seem...";
}
