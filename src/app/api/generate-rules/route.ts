import { NextResponse } from "next/server";

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

const SYSTEM_PROMPT = `You are a creative card game designer. Generate 6 unique, playable hidden rules for a game of Mao.

Rules must:
- Be concise (one sentence, under 15 words)
- Reference specific card ranks (2-10, J, Q, K, A) or suits (spades, hearts, clubs, diamonds)
- Be mechanically enforceable in a standard card game
- Be fun and surprising
- Vary from the following example rules (don't just rephrase these):
${RULE_EXAMPLES.map(r => "- " + r).join("\n")}

Respond with ONLY a JSON array of 6 strings, one rule per string. No markdown, no explanation, no numbering.`;

export async function POST() {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    // Fallback: pick 6 random from examples
    const shuffled = [...RULE_EXAMPLES].sort(() => Math.random() - 0.5);
    return NextResponse.json({ rules: shuffled.slice(0, 6), source: "fallback" });
  }

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: "Generate 6 unique Mao hidden rules." }],
        max_tokens: 500,
        temperature: 0.9,
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const rules = JSON.parse(jsonMatch[0]);
      if (Array.isArray(rules) && rules.length === 6) {
        return NextResponse.json({ rules: rules.slice(0, 6), source: "deepseek" });
      }
    }

    throw new Error("Failed to parse rules");
  } catch {
    // Fallback on error
    const shuffled = [...RULE_EXAMPLES].sort(() => Math.random() - 0.5);
    return NextResponse.json({ rules: shuffled.slice(0, 6), source: "fallback" });
  }
}
