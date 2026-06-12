import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../trpc";
import { generateSpeechFromModal } from "@/lib/modal";
import { uploadToR2, getPresignedDownloadUrl } from "@/lib/r2";

export const ttsRouter = router({
  generateSpeech: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1),
        voiceId: z.string(),
        exaggeration: z.number().min(0).max(1).default(0.5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { text, voiceId, exaggeration } = input;
      const user = ctx.dbUser;

      // Plan limits check
      const maxChars = user.plan === "PRO" ? 5000 : 500;
      if (text.length > maxChars) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Text length exceeds maximum allowed for your plan (${maxChars} characters).`,
        });
      }

      // Usage limits check
      if (user.plan === "FREE" && user.usageCount >= 10) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You have reached the free tier limit of 10 generations. Please upgrade to Pro for unlimited generations.",
        });
      }

      // Fetch the voice
      const voice = await ctx.prisma.voice.findUnique({
        where: { id: voiceId },
      });

      if (!voice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice not found.",
        });
      }

      // Security check: must be either system voice or owned by current user
      if (!voice.isSystem && voice.userId !== user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You do not have access to this voice.",
        });
      }

      // If voice has an R2 key (cloned voice), get download url
      let voiceSampleUrl: string | undefined = undefined;
      const isConfigured = !!process.env.CLOUDFLARE_R2_BUCKET && !!process.env.MODAL_GENERATION_URL;

      if (voice.r2Key) {
        if (isConfigured && !voice.r2Key.startsWith("demo-voice-key-")) {
          voiceSampleUrl = await getPresignedDownloadUrl(voice.r2Key);
        } else {
          // Fallback voice sample url in demo mode
          voiceSampleUrl = "https://www2.cs.uic.edu/~i101/SoundFiles/preamble10.wav";
        }
      }

      try {
        let audioUrl = "";
        let duration = 5.0;
        const generationId = crypto.randomUUID();
        const r2Key = `generations/${user.id}/${generationId}.wav`;

        if (!isConfigured) {
          console.warn("⚠️ Voicey running in Demo mode: MODAL_GENERATION_URL or R2 keys are not configured. Using same-origin audio proxy.");
          // Use our same-origin audio proxy to prevent CORS blocks
          audioUrl = `/api/audio/demo-fallback-key`;
          duration = 10.0;
        } else {
          // Generate audio from Modal
          const audioBuffer = await generateSpeechFromModal(text, voiceSampleUrl, exaggeration);

          // Upload to R2
          audioUrl = await uploadToR2(r2Key, audioBuffer, "audio/wav");
          duration = Math.round((audioBuffer.length / 32000) * 10) / 10;
        }

        const generation = await ctx.prisma.generation.create({
          data: {
            id: generationId,
            userId: user.id,
            text,
            voiceId,
            r2Key: isConfigured ? r2Key : "demo-fallback-key",
            duration,
          },
        });

        // Increment usage count
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: {
            usageCount: {
              increment: 1,
            },
          },
        });

        return {
          ...generation,
          url: audioUrl,
        };
      } catch (error: any) {
        console.error("Speech generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to generate speech. Please try again later.",
        });
      }
    }),

  getGenerations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.generation.findMany({
      where: { userId: ctx.dbUser.id },
      orderBy: { createdAt: "desc" },
      include: {
        voice: true,
      },
    });
  }),
});
