"use client";

import React from "react";

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function UserButton({ appearance }: { appearance?: any }) {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-xs font-bold text-xs select-none">
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
      fullName: "Local Creator",
      imageUrl: "",
      emailAddresses: [{ emailAddress: "sugandhmahajan030@gmail.com" }],
      primaryEmailAddress: { emailAddress: "sugandhmahajan030@gmail.com" },
    },
  };
}

export function useClerk() {
  return {
    openUserProfile: () => {
      console.log("Mock profile opened");
    },
    signOut: ({ redirectUrl = "/" }: { redirectUrl?: string } = {}) => {
      console.log("Signing out (mock)");
      window.location.href = redirectUrl;
    },
  };
}

export function SignIn() {
  return (
    <div className="p-8 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-lg max-w-sm w-full text-center space-y-4">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Sign In (Mock Mode)</h2>
      <p className="text-zinc-500 text-sm">You are automatically authenticated as Local Creator in local development mode.</p>
      <a
        href="/"
        className="inline-block w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-lg hover:from-violet-500 hover:to-fuchsia-500 transition-all text-sm"
      >
        Go to Dashboard
      </a>
    </div>
  );
}

export function SignUp() {
  return (
    <div className="p-8 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-lg max-w-sm w-full text-center space-y-4">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Sign Up (Mock Mode)</h2>
      <p className="text-zinc-500 text-sm">You are automatically authenticated as Local Creator in local development mode.</p>
      <a
        href="/"
        className="inline-block w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-lg hover:from-violet-500 hover:to-fuchsia-500 transition-all text-sm"
      >
        Go to Dashboard
      </a>
    </div>
  );
}

export function OrganizationList(props: any) {
  return (
    <div className="p-8 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-lg max-w-sm w-full text-center space-y-4">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Organization List (Mock Mode)</h2>
      <p className="text-zinc-500 text-sm">Organizations are bypassed in local development mode.</p>
      <a
        href="/"
        className="inline-block w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-lg hover:from-violet-500 hover:to-fuchsia-500 transition-all text-sm"
      >
        Go to Dashboard
      </a>
    </div>
  );
}
