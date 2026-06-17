import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const keyPresent = !!stripeKey;
  const keyLen = stripeKey ? stripeKey.length : 0;

  if (!stripeKey) {
    return NextResponse.json({ url: "/?unlocked=true", debug: "no key", keyPresent, keyLen });
  }

  try {
    const client = new Stripe(stripeKey);

    const session = await client.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: "Mao AI — Lifetime Access" },
          unit_amount: 399,
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_URL || "https://mao-ai-production.up.railway.app"}/?unlocked=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || "https://mao-ai-production.up.railway.app"}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json({ url: "/?unlocked=true", error: String(e) });
  }
}
