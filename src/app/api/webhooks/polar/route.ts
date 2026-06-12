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

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("webhook-signature");
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const isValid = verifyPolarWebhook(payload, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (webhookSecret) {
    // If webhook secret is defined but no signature is provided, reject it in production
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }
  }

  try {
    const body = JSON.parse(payload);
    const eventType = body.type;
    const data = body.data;
    
    // Check metadata in data or root
    const metadata = data?.metadata || body.metadata || {};
    const clerkUserId = metadata.clerkUserId;

    if (!clerkUserId) {
      console.warn("Polar webhook received but clerkUserId was missing in metadata:", eventType);
      return NextResponse.json({ received: true, info: "No clerkUserId metadata" });
    }

    if (eventType === "subscription.created" || eventType === "subscription.updated") {
      const status = data.status;
      const plan = status === "active" ? "PRO" : "FREE";

      await prisma.user.update({
        where: { clerkId: clerkUserId },
        data: { plan },
      });
      console.log(`Updated user ${clerkUserId} plan to ${plan} due to ${eventType}`);
    } else if (eventType === "subscription.revoked") {
      await prisma.user.update({
        where: { clerkId: clerkUserId },
        data: { plan: "FREE" },
      });
      console.log(`Updated user ${clerkUserId} plan to FREE due to subscription revocation`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error handling Polar webhook:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
