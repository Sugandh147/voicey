import { router } from "../trpc";
import { ttsRouter } from "./routers/tts";
import { voicesRouter } from "./routers/voices";
import { billingRouter } from "./routers/billing";
import { translationRouter } from "./routers/translation";

export const appRouter = router({
  tts: ttsRouter,
  voices: voicesRouter,
  billing: billingRouter,
  translation: translationRouter,
});

export type AppRouter = typeof appRouter;
