import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../trpc";
import { generateSpeechFromModal } from "@/lib/modal";
import { uploadToR2, getPresignedDownloadUrl } from "@/lib/r2";
import { rewriteTextForTone } from "@/lib/rewriter";
import { generateSpeechLocal } from "@/lib/tts-local";
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
        tone: z.string().optional(),
        emotion: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { text, voiceId, exaggeration, targetLang, tone, emotion } = input;
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

      // In demo mode, we do NOT automatically rewrite text on the server.
      // The frontend handles auto-rewriting when 'Auto-Rewrite on Tone Change' is enabled.
      // This allows the user to speak exactly what they type.
      let processedText = text;

      // Translation step
      let translatedText = processedText;
      if (targetLang && targetLang !== "en") {
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(processedText)}`;
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

      // If voice has an R2 key (cloned voice), get download url or load it locally
      let voiceSampleUrl: string | undefined = undefined;
      let voiceSampleBase64: string | undefined = undefined;
      const isConfigured = !!process.env.MODAL_GENERATION_URL;
      const hasR2 = !!process.env.CLOUDFLARE_R2_BUCKET;
      
      if (voice.r2Key) {
        if (hasR2 && !voice.r2Key.startsWith("demo-voice-key-")) {
          voiceSampleUrl = await getPresignedDownloadUrl(voice.r2Key);
        } else {
          // If it's a real generation but we don't have R2, it's stored locally
          // Or if it's a demo key, it's also local. We load it as Base64 for Modal!
          try {
            let filePath = "";
            if (voice.r2Key.startsWith("demo-voice-key-")) {
              filePath = path.join(process.cwd(), "public", "demo-voices", `${voice.r2Key}.wav`);
            } else {
              const r2KeyWithoutWav = voice.r2Key.replace(".wav", "");
              filePath = path.join(process.cwd(), "public", "demo-voices", `${r2KeyWithoutWav}.wav`);
            }
            if (fs.existsSync(filePath)) {
              voiceSampleBase64 = fs.readFileSync(filePath).toString("base64");
            }
          } catch (e) {
            console.error("Failed to load local voice file to Base64", e);
          }
          // Optional: fallback url just in case
          voiceSampleUrl = `http://127.0.0.1:3000/api/audio/${voice.r2Key}`;
        }
      }

      try {
        let audioUrl = "";
        let duration = 5.0;
        const generationId = crypto.randomUUID();
        const fallbackR2Key = `demo-generations/${generationId}.mp3`;
        let finalR2Key = fallbackR2Key;

        if (!isConfigured) {
          console.warn("⚠️ Voicey running in Demo mode: Generating speech locally.");
          const lang = targetLang || "en";
          
          const localTtsResult = await generateSpeechLocal(
            translatedText,
            voice.name,
            exaggeration,
            tone || "podcast",
            lang,
            emotion || "cheerful"
          );

          // Write file to local cached directory
          const dir = path.join(process.cwd(), "public", "demo-generations");
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          const filePath = path.join(dir, `${generationId}.mp3`);
          fs.writeFileSync(filePath, localTtsResult.buffer);

          audioUrl = `/api/audio/${fallbackR2Key}`;
          const wordCount = translatedText.split(/\s+/).length;
          duration = Math.max(2.0, Math.round((wordCount / 2.5) * 10) / 10);
        } else {
          // Generate audio from Modal (zero-shot TTS)
          // Since ChatterboxTTS is an LLM-based TTS, we can condition the tone by prepending an emotion tag
          let textWithEmotion = translatedText;
          if (emotion && emotion !== "neutral") {
            const formattedEmotion = emotion.replace("_", " ").toLowerCase();
            // e.g., [Cheerful] or [Fully expressive]
            textWithEmotion = `[${formattedEmotion.charAt(0).toUpperCase() + formattedEmotion.slice(1)}] ${translatedText}`;
          }

          const audioBuffer = await generateSpeechFromModal(textWithEmotion, voiceSampleUrl, voiceSampleBase64, exaggeration);

          finalR2Key = `generations/${user.id}/${generationId}.wav`;
          
          if (hasR2) {
            // Upload to R2
            audioUrl = await uploadToR2(finalR2Key, audioBuffer, "audio/wav");
          } else {
            // Save locally
            const dir = path.join(process.cwd(), "public", "generations", user.id);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            const filePath = path.join(dir, `${generationId}.wav`);
            fs.writeFileSync(filePath, audioBuffer);
            audioUrl = `/api/audio/${finalR2Key}`;
          }
          
          duration = Math.round((audioBuffer.length / 32000) * 10) / 10;
        }

        const generation = await ctx.prisma.generation.create({
          data: {
            id: generationId,
            userId: user.id,
            text: translatedText,
            voiceId,
            r2Key: finalR2Key,
            duration,
            targetLang: targetLang || "en",
            tone: tone || "podcast",
            emotion: emotion || "cheerful",
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

  migrateMockData: protectedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.dbUser;
    
    // Transfer voices
    await ctx.prisma.voice.updateMany({
      where: { userId: "mock_user_123" },
      data: { userId: user.id }
    });

    // Transfer generations
    const updatedGenerations = await ctx.prisma.generation.updateMany({
      where: { userId: "mock_user_123" },
      data: { userId: user.id }
    });

    return { migratedCount: updatedGenerations.count };
  }),
});
