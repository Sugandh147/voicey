import { NextRequest, NextResponse } from "next/server";

export async function auth() {
  return {
    userId: "mock_user_123",
    sessionId: "mock_session_123",
    protect: async () => ({ userId: "mock_user_123" }),
  };
}

export async function currentUser() {
  return {
    id: "mock_user_123",
    firstName: "Local Creator",
    lastName: "User",
    emailAddresses: [{ emailAddress: "sugandhmahajan030@gmail.com" }],
  };
}

type MiddlewareHandler = (
  auth: { protect: () => Promise<{ userId: string }>; userId: string },
  req: NextRequest,
  event: unknown
) => Promise<NextResponse | Response | void> | NextResponse | Response | void;

export const clerkMiddleware = (handler?: MiddlewareHandler) => {
  return async (req: NextRequest, event: unknown) => {
    const mockAuth = {
      protect: async () => ({ userId: "mock_user_123" }),
      userId: "mock_user_123",
    };
    if (typeof handler === "function") {
      const result = await handler(mockAuth, req, event);
      if (result) return result;
    }
    return NextResponse.next();
  };
};

export const createRouteMatcher = () => {
  return () => false;
};
