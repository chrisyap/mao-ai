import { Violation } from "@/lib/types";
import { SUIT_SYMBOLS } from "@/lib/cards";

interface RuleLogProps {
  violations: Violation[];
}

export function RuleLog({ violations }: RuleLogProps) {
  const recent = violations.slice(-10).reverse();

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">
        Rule Discovery Log ({violations.length} violations)
      </p>
      <div className="space-y-1.5">
        {recent.map((v, i) => (
          <div
            key={`${v.turn}-${i}`}
            className={`text-xs leading-relaxed rounded-lg px-2.5 py-1.5 ${
              v.by === "player" ? "bg-red-500/5" : "bg-purple-500/5"
            }`}
          >
            <span className="text-white/30 text-[10px] mr-1">
              #{v.turn}
            </span>
            <span className={v.by === "player" ? "text-red-300/80" : "text-purple-300/80"}>
              {v.by === "player" ? "You" : "CPU"}
            </span>
            <span className="text-white/40">
              {" "}broke a rule:
            </span>
            <span className="text-white/50 italic ml-1">
              &ldquo;{v.ruleHint}&rdquo;
            </span>
            {v.cardPlayed && (
              <span className="text-white/20 ml-1">
                ({v.cardPlayed.rank}{SUIT_SYMBOLS[v.cardPlayed.suit]})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
