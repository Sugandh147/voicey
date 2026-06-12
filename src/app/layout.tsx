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
  title: "Voicey - AI Voice SaaS Platform",
  description: "Clone voices and generate realistic text-to-speech speech with zero-shot inference.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body
          className={`${inter.variable} font-sans bg-zinc-950 text-zinc-50 antialiased`}
        >
          <Providers>
            {children}
          </Providers>
          <Toaster theme="dark" position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
