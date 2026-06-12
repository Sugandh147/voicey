import { Polar } from "@polar-sh/sdk";

const accessToken = process.env.POLAR_ACCESS_TOKEN || "";
// Determine if we should run in sandbox mode or production
const isSandbox = process.env.NODE_ENV !== "production" || accessToken.startsWith("polar_s_");

export const polar = new Polar({
  accessToken,
  server: isSandbox ? "sandbox" : "production",
});

export async function createPolarCheckoutSession(params: {
  priceId: string;
  successUrl: string;
  customerEmail: string;
  clerkUserId: string;
}) {
  try {
    const checkout = await polar.checkouts.create({
      products: [params.priceId],
      successUrl: params.successUrl,
      customerEmail: params.customerEmail,
      metadata: {
        clerkUserId: params.clerkUserId,
      },
    });
    return checkout.url;
  } catch (error) {
    console.error("Error creating Polar checkout session:", error);
    throw new Error("Failed to create billing checkout session");
  }
}
