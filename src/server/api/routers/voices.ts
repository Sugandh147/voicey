import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../trpc";
import { deleteFromR2, getPresignedUploadUrl } from "@/lib/r2";

export const voicesRouter = router({
  getVoices: protectedProcedure.query(async ({ ctx }) => {
    // Return all system voices plus user's cloned voices
    return ctx.prisma.voice.findMany({
      where: {
        OR: [
          { isSystem: true },
          { userId: ctx.dbUser.id },
        ],
      },
      orderBy: [
        { isSystem: "desc" },
        { createdAt: "desc" },
      ],
    });
  }),

  getPresignedUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { filename, contentType } = input;
      
      // Basic validation for audio content type
      if (!contentType.startsWith("audio/")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only audio files are allowed.",
        });
      }

      const fileExtension = filename.split(".").pop() || "wav";
      const randomId = crypto.randomUUID();
      const r2Key = `voices/${ctx.dbUser.id}/${randomId}.${fileExtension}`;

      const isConfigured = !!process.env.CLOUDFLARE_R2_BUCKET && !!process.env.CLOUDFLARE_R2_ACCOUNT_ID;

      if (!isConfigured) {
        return {
          uploadUrl: `/api/mock-upload?key=demo-voice-key-${randomId}`,
          r2Key: `demo-voice-key-${randomId}`,
        };
      }

      try {
        const uploadUrl = await getPresignedUploadUrl(r2Key, contentType);
        return {
          uploadUrl,
          r2Key,
        };
      } catch (error) {
        console.error("Error generating presigned URL:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate file upload link.",
        });
      }
    }),

  createVoice: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        r2Key: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { name, r2Key } = input;

      // Security verify: ensure the R2 key path matches user's directory
      const expectedPrefix = `voices/${ctx.dbUser.id}/`;
      const isDemoKey = r2Key.startsWith("demo-voice-key-");
      if (!r2Key.startsWith(expectedPrefix) && !isDemoKey) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized key access. The key does not belong to your account.",
        });
      }

      try {
        const voice = await ctx.prisma.voice.create({
          data: {
            userId: ctx.dbUser.id,
            name,
            r2Key,
            isSystem: false,
          },
        });
        return voice;
      } catch (error) {
        console.error("Error creating voice in DB:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save voice to library.",
        });
      }
    }),

  deleteVoice: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;

      const voice = await ctx.prisma.voice.findUnique({
        where: { id },
      });

      if (!voice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice not found.",
        });
      }

      if (voice.isSystem || voice.userId !== ctx.dbUser.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You do not have permission to delete this voice.",
        });
      }

      try {
        // Delete from R2
        if (voice.r2Key && !voice.r2Key.startsWith("demo-voice-key-")) {
          await deleteFromR2(voice.r2Key);
        }
        
        // Delete from DB
        await ctx.prisma.voice.delete({
          where: { id },
        });

        return { success: true };
      } catch (error) {
        console.error("Error deleting voice:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete voice.",
        });
      }
    }),
});
