import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../trpc";
import { createPolarCheckoutSession } from "@/lib/polar";
import { prisma } from "@/lib/db";

export const billingRouter = router({
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        successUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = ctx.dbUser;
      const clerkUserId = ctx.userId;

      // Find the price ID from environment
      const priceId = process.env.POLAR_PRO_PRICE_ID;
      if (!priceId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Polar Pro Price ID is not configured on the server.",
        });
      }

      try {
        const checkoutUrl = await createPolarCheckoutSession({
          priceId,
          successUrl: input.successUrl,
          customerEmail: user.email,
          clerkUserId,
        });

        return { checkoutUrl };
      } catch (error: any) {
        console.error("Error creating checkout session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create subscription checkout link.",
        });
      }
    }),

  getUserPlan: protectedProcedure.query(async ({ ctx }) => {
    // Always re-fetch from DB so we get the latest plan after a webhook update
    const freshUser = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
    });
    const plan = freshUser?.plan ?? ctx.dbUser.plan;
    return {
      plan,
      usageCount: freshUser?.usageCount ?? ctx.dbUser.usageCount,
      usageLimit: plan === "PRO" ? Infinity : 10,
    };
  }),

  // Called by the success screen after a completed mock/real payment
  // to immediately reflect PRO status without waiting for a webhook.
  manualUpgradePro: protectedProcedure.mutation(async ({ ctx }) => {
    const updated = await prisma.user.update({
      where: { clerkId: ctx.userId! },
      data: { plan: "PRO" },
    });
    return { plan: updated.plan };
  }),
});
