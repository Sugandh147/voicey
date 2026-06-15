import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../trpc";

export const translationRouter = router({
  translateText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1),
        sourceLang: z.string().default("auto"),
        targetLang: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { text, sourceLang, targetLang } = input;
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Translation API returned status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data || !data[0]) {
          throw new Error("Invalid response format from translation service");
        }
        
        const translatedText = data[0].map((item: any) => item[0] || "").join("");
        return { translatedText };
      } catch (error: any) {
        console.error("Translation API fetch error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to translate text. Please try again.",
        });
      }
    }),

  createTranslation: protectedProcedure
    .input(
      z.object({
        sourceText: z.string().min(1),
        sourceLang: z.string(),
        targetText: z.string().min(1),
        targetLang: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { sourceText, sourceLang, targetText, targetLang } = input;
      try {
        const translation = await ctx.prisma.translation.create({
          data: {
            userId: ctx.dbUser.id,
            sourceText,
            sourceLang,
            targetText,
            targetLang,
          },
        });
        return translation;
      } catch (error: any) {
        console.error("Error creating database translation record:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save translation record to database.",
        });
      }
    }),

  getTranslations: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.prisma.translation.findMany({
        where: { userId: ctx.dbUser.id },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("Error fetching translations:", error);
      return [];
    }
  }),

  deleteTranslation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      
      const translation = await ctx.prisma.translation.findUnique({
        where: { id },
      });
      
      if (!translation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Translation record not found.",
        });
      }
      
      if (translation.userId !== ctx.dbUser.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You do not have access to this translation.",
        });
      }
      
      try {
        await ctx.prisma.translation.delete({
          where: { id },
        });
        return { success: true };
      } catch (error) {
        console.error("Error deleting translation record:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete translation.",
        });
      }
    }),
});
