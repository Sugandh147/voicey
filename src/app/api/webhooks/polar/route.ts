import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

function verifyPolarWebhook(payload: string, signatureHeader: string, secret: string): boolean {
  try {
    const parts = signatureHeader.split(",");
    let timestamp = "";
    let signature = "";
    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key === "t") timestamp = value;
      if (key === "v1") signature = value;
    }
    if (!timestamp || !signature) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, "utf-8"),
      Buffer.from(signature, "utf-8")
    );
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

/** Extract clerkUserId from wherever Polar puts it in the event payload */
function extractClerkUserId(body: any): string | null {
  // Polar puts metadata in multiple places depending on event type
  return (
    body?.data?.metadata?.clerkUserId ||
    body?.metadata?.clerkUserId ||
    body?.data?.checkout?.metadata?.clerkUserId ||
    body?.data?.customer_metadata?.clerkUserId ||
    null
  );
}

/** Determine if an event means the user should be on PRO */
function resolveNewPlan(eventType: string, data: any): "PRO" | "FREE" | null {
  switch (eventType) {
    // Subscription events
    case "subscription.created":
    case "subscription.updated":
      return data?.status === "active" ? "PRO" : "FREE";

    case "subscription.revoked":
    case "subscription.canceled":
      return "FREE";

    // Order / one-time purchase events (Polar fires these on checkout success)
    case "order.created":
      return data?.status === "paid" || data?.billing_reason === "purchase" ? "PRO" : null;

    // Checkout completed
    case "checkout.updated":
      return data?.status === "succeeded" || data?.status === "confirmed" ? "PRO" : null;

    default:
      return null; // Ignore unknown events
  }
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("webhook-signature");
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

  // ── Signature verification ──────────────────────────────────────────────
  if (webhookSecret && signature) {
    const isValid = verifyPolarWebhook(payload, signature, webhookSecret);
    if (!isValid) {
      console.warn("Polar webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (webhookSecret && !signature) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }
  }

  // ── Parse & handle ──────────────────────────────────────────────────────
  try {
    const body = JSON.parse(payload);
    const eventType: string = body.type ?? "";
    const data = body.data ?? {};

    console.log(`📨 Polar webhook: ${eventType}`);

    const clerkUserId = extractClerkUserId(body);

    if (!clerkUserId) {
      console.warn(`Polar webhook [${eventType}]: clerkUserId missing in metadata`);
      return NextResponse.json({ received: true, info: "No clerkUserId — skipped" });
    }

    const newPlan = resolveNewPlan(eventType, data);

    if (newPlan !== null) {
      await prisma.user.update({
        where: { clerkId: clerkUserId },
        data: { plan: newPlan },
      });
      console.log(`✅ Updated user ${clerkUserId} → ${newPlan} (event: ${eventType})`);
    } else {
      console.log(`ℹ️  Polar webhook [${eventType}]: no plan change needed`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error handling Polar webhook:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
