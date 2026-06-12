import { router } from "../trpc";
import { ttsRouter } from "./routers/tts";
import { voicesRouter } from "./routers/voices";
import { billingRouter } from "./routers/billing";

export const appRouter = router({
  tts: ttsRouter,
  voices: voicesRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
