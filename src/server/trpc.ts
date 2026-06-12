import { initTRPC, TRPCError } from "@trpc/server";
import { type Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use((opts) => {
  const { ctx } = opts;
  if (!ctx.userId || !ctx.dbUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }
  return opts.next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      dbUser: ctx.dbUser,
    },
  });
});
