import React from 'react';

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function UserButton() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-violet-600 text-white shadow-xs font-bold text-sm">
      LC
    </div>
  );
}

export function useUser() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: "mock_user_123",
      firstName: "Local Creator",
      lastName: "User",
      imageUrl: "",
      emailAddresses: [{ emailAddress: "sugandhmahajan030@gmail.com" }]
    }
  };
}

export function useClerk() {
  return {
    openUserProfile: () => {
      console.log("Mock profile opened");
    },
    signOut: () => {
      console.log("Signing out (mock)");
      window.location.href = "/";
    }
  };
}

export function SignIn() {
  return (
    <div className="p-8 border border-zinc-250 bg-white rounded-xl shadow-lg max-w-sm w-full text-center space-y-4">
      <h2 className="text-xl font-bold text-zinc-900">Sign In (Mocked)</h2>
      <p className="text-zinc-500 text-sm">You are automatically signed in using mock credentials.</p>
      <a href="/" className="inline-block w-full py-2 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-500">
        Go to Dashboard
      </a>
    </div>
  );
}

export function SignUp() {
  return (
    <div className="p-8 border border-zinc-250 bg-white rounded-xl shadow-lg max-w-sm w-full text-center space-y-4">
      <h2 className="text-xl font-bold text-zinc-900">Sign Up (Mocked)</h2>
      <p className="text-zinc-500 text-sm">You are automatically signed in using mock credentials.</p>
      <a href="/" className="inline-block w-full py-2 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-500">
        Go to Dashboard
      </a>
    </div>
  );
}
