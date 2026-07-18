import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voicey - Your Voice Workshop",
  description: "Create natural, lifelike text-to-speech recordings in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.variable} font-sans bg-background text-foreground antialiased bg-gradient-to-tr from-violet-50/50 via-white to-fuchsia-50/50 dark:from-violet-950/20 dark:via-zinc-950 dark:to-fuchsia-950/20 min-h-screen`}
        >
          <Providers>
            {children}
          </Providers>
          <Toaster position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
