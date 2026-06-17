import { Card } from "@/lib/cards";
import { SUIT_SYMBOLS, SUIT_COLORS } from "@/lib/cards";

interface CardViewProps {
  card: Card;
  faceUp?: boolean;
  selected?: boolean;
  small?: boolean;
}

export function CardView({ card, faceUp = false, selected = false, small = false }: CardViewProps) {
  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  const isFace = card.rank === "A" || card.rank === "K" || card.rank === "Q" || card.rank === "J";

  const w = small ? "w-12" : "w-16";
  const h = small ? "h-[72px]" : "h-24";
  const rankSize = small ? "text-sm" : "text-lg";
  const symSize = small ? "text-base" : "text-xl";

  if (!faceUp) {
    return (
      <div
        className={`${w} ${h} rounded-xl border border-white/10 bg-gradient-to-br from-purple-900/60 via-purple-800/40 to-indigo-900/60 flex items-center justify-center shadow-lg shadow-purple-500/5`}
      >
        <span className="text-xl opacity-40">🂠</span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${w} ${h} rounded-xl border ${
        selected
          ? "border-purple-400 shadow-lg shadow-purple-500/30 scale-110 -translate-y-4"
          : "border-white/15 shadow-lg shadow-black/30 hover:shadow-purple-500/15"
      } bg-gradient-to-br from-white via-white to-gray-50 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer select-none ${
        isFace ? "ring-1 ring-purple-300/30" : ""
      } hover:-translate-y-2 active:scale-95`}
    >
      {/* Rank in top-left */}
      <span
        className={`absolute top-1 left-1.5 font-black leading-none ${rankSize} ${color}`}
      >
        {card.rank}
      </span>

      {/* Center suit */}
      <span className={`${symSize} leading-none mt-1 ${color}`}>{symbol}</span>

      {/* Mini rank in bottom-right */}
      <span
        className={`absolute bottom-1 right-1.5 font-black leading-none text-[8px] ${color} rotate-180`}
      >
        {card.rank}
      </span>
    </div>
  );
}
