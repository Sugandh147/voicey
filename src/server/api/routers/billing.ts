import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../trpc";
import { createPolarCheckoutSession } from "@/lib/polar";

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
    return {
      plan: ctx.dbUser.plan,
      usageCount: ctx.dbUser.usageCount,
      usageLimit: ctx.dbUser.plan === "PRO" ? Infinity : 10,
    };
  }),
});
