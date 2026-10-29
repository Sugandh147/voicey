import { NextResponse } from "next/server";

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

export const clerkMiddleware = (handler?: any) => {
  return async (req: any, event: any) => {
    const mockAuth = {
      protect: async () => ({ userId: "mock_user_123" }),
      userId: "mock_user_123",
    };
    if (typeof handler === "function") {
      return handler(mockAuth, req, event);
    }
    return NextResponse.next();
  };
};

export const createRouteMatcher = (patterns: string[] = []) => {
  return (req: any) => false;
};
