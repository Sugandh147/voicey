export async function auth() {
  return {
    userId: "mock_user_123"
  };
}

export async function currentUser() {
  return {
    id: "mock_user_123",
    firstName: "Local Creator",
    emailAddresses: [{ emailAddress: "sugandhmahajan030@gmail.com" }]
  };
}

export const clerkMiddleware = (handler: any) => {
  return (req: any, event: any) => {
    const mockAuth = {
      protect: async () => {
        return { userId: "mock_user_123" };
      },
      userId: "mock_user_123"
    };
    return handler(mockAuth, req, event);
  };
};

export const createRouteMatcher = () => {
  return () => false;
};
