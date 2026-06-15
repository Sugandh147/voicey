import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../trpc";
import { generateSpeechFromModal } from "@/lib/modal";
import { uploadToR2, getPresignedDownloadUrl } from "@/lib/r2";
import fs from "fs";
import path from "path";

export const ttsRouter = router({
  generateSpeech: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1),
        voiceId: z.string(),
        exaggeration: z.number().min(0).max(1).default(0.5),
        targetLang: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { text, voiceId, exaggeration, targetLang } = input;
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

      // Translation step
      let translatedText = text;
      if (targetLang && targetLang !== "en") {
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (data && data[0]) {
              translatedText = data[0].map((item: any) => item[0] || "").join("").trim();
            }
          }
        } catch (error) {
          console.error("Translation helper failed in generateSpeech:", error);
        }
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
        const r2Key = `demo-generations/${generationId}.mp3`;

        if (!isConfigured) {
          console.warn("⚠️ Voicey running in Demo mode: Fetching Google Translate TTS for audio generation.");
          const lang = targetLang || "en";
          const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(translatedText)}`;
          const response = await fetch(googleTtsUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
          });

          if (!response.ok) {
            throw new Error(`Google Translate TTS returned status: ${response.status}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuffer);

          // Write file to local cached directory
          const dir = path.join(process.cwd(), "public", "demo-generations");
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          const filePath = path.join(dir, `${generationId}.mp3`);
          fs.writeFileSync(filePath, audioBuffer);

          audioUrl = `/api/audio/${r2Key}`;
          const wordCount = translatedText.split(/\s+/).length;
          duration = Math.max(2.0, Math.round((wordCount / 2.5) * 10) / 10);
        } else {
          // Generate audio from Modal (zero-shot TTS)
          const audioBuffer = await generateSpeechFromModal(translatedText, voiceSampleUrl, exaggeration);

          // Upload to R2
          const r2RealKey = `generations/${user.id}/${generationId}.wav`;
          audioUrl = await uploadToR2(r2RealKey, audioBuffer, "audio/wav");
          duration = Math.round((audioBuffer.length / 32000) * 10) / 10;
        }

        const generation = await ctx.prisma.generation.create({
          data: {
            id: generationId,
            userId: user.id,
            text: translatedText,
            voiceId,
            r2Key: isConfigured ? `generations/${user.id}/${generationId}.wav` : r2Key,
            duration,
            targetLang: targetLang || "en",
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
