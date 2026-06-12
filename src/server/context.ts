import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function createContext() {
  const authSession = await auth();
  const clerkUserId = authSession.userId;

  let dbUser = null;

  if (clerkUserId) {
    dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const email = clerkUser.emailAddresses[0]?.emailAddress || `user_${clerkUserId}@noemail.com`;
        const isAdmin = email === "sugandhmahajan030@gmail.com";

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              clerkId: clerkUserId,
              email,
              plan: isAdmin ? "PRO" : "FREE",
              usageCount: 0,
            },
          });
        } else if (isAdmin && dbUser.plan !== "PRO") {
          // Auto-upgrade creator if they are registered as FREE
          dbUser = await prisma.user.update({
            where: { clerkId: clerkUserId },
            data: { plan: "PRO" },
          });
          console.log(`✅ Auto-upgraded creator (${email}) to PRO plan.`);
        } else if (dbUser.email !== email) {
          // Sync email if changed
          dbUser = await prisma.user.update({
            where: { clerkId: clerkUserId },
            data: { email },
          });
        }
      }
    } catch (error) {
      console.error("Error auto-syncing Clerk user to database:", error);
    }
  }

  return {
    userId: clerkUserId,
    dbUser,
    prisma,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
