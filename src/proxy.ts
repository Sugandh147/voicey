import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)"
]);

const isDummyClerk =
  !process.env.CLERK_SECRET_KEY ||
  process.env.CLERK_SECRET_KEY === "sk_test_dummy" ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes("dummy");

export default clerkMiddleware(async (auth, req) => {
  // Allow access in local mock mode
  if (isDummyClerk) {
    return NextResponse.next();
  }

  // Allow access to public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Enforce authentication on all other routes
  await auth.protect();
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/(.*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
