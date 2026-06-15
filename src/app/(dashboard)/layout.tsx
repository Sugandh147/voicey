"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton, useUser, useClerk } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc";
import { useTheme } from "next-themes";
import { 
  LayoutDashboard, 
  Mic2, 
  AudioLines, 
  Menu, 
  X, 
  Zap, 
  Loader2,
  LogOut,
  Languages,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ProUpgradeModal from "@/components/ProUpgradeModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Fetch plan status to show badge and upgrades
  const { data: planData, isLoading: planLoading } = trpc.billing.getUserPlan.useQuery(undefined, {
    enabled: isSignedIn,
  });

  const checkoutMutation = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to initiate upgrade process");
    },
  });

  const handleUpgrade = () => {
    setUpgradeModalOpen(true);
  };

  const handleRealCheckout = () => {
    const successUrl = `${window.location.origin}/`;
    checkoutMutation.mutate({ successUrl });
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Text to Speech", href: "/text-to-speech", icon: AudioLines },
    { name: "Voice Library", href: "/voices", icon: Mic2 },
    { name: "Speech Translator", href: "/speech-translation", icon: Languages },
  ];

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const themeToggle = mounted ? (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 h-9 w-9 rounded-lg active:scale-95 transition-all"
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-indigo-500" />
      )}
    </Button>
  ) : (
    <div className="h-9 w-9 rounded-lg bg-zinc-150 dark:bg-zinc-800 animate-pulse" />
  );

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-6 bg-white dark:bg-zinc-900 border-r border-zinc-200/80 dark:border-zinc-800 shadow-xs shadow-zinc-150/40 dark:shadow-none">
      <div className="space-y-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 px-2 transition-transform hover:scale-102">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/20 animate-float">
            <AudioLines className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">Voicey</span>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold tracking-widest uppercase">Self-Hosted TTS</p>
          </div>
        </Link>

        {/* Plan Status Card */}
        {isSignedIn && (
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Current Plan</span>
              {planLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
              ) : (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  planData?.plan === "PRO" 
                    ? "bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/20 dark:border-violet-500/30" 
                    : "bg-zinc-205 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 border border-zinc-300 dark:border-zinc-700"
                }`}>
                  {planData?.plan || "FREE"}
                </span>
              )}
            </div>
            
            {planData?.plan === "FREE" && (
              <Button 
                onClick={handleUpgrade}
                disabled={checkoutMutation.isPending}
                className="w-full mt-2 h-9 text-xs gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-md shadow-violet-600/15 hover:shadow-violet-600/25 active:scale-98 transition-all duration-300"
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "bg-violet-600/10 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-l-2 border-violet-600 pl-2.5 shadow-xs shadow-violet-500/5"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40"
                } hover:translate-x-0.5`}
              >
                <Icon className={`h-4.5 w-4.5 transition-transform duration-300 ${isActive ? "text-violet-600 scale-105" : "text-zinc-400 group-hover:text-zinc-655"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Actions */}
      <div className="flex flex-col gap-3 border-t border-zinc-200/80 dark:border-zinc-800 pt-4 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserButton 
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs",
                }
              }}
            />
            <div 
              onClick={() => openUserProfile()} 
              className="flex flex-col text-left cursor-pointer hover:opacity-80 transition-opacity select-none"
            >
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">My Account</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Settings & billing</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {themeToggle}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                signOut();
                toast.success("Signed out successfully");
              }}
              className="text-zinc-450 dark:text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 h-8.5 w-8.5 rounded-lg transition-all"
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
    <ProUpgradeModal
      open={upgradeModalOpen}
      onClose={() => setUpgradeModalOpen(false)}
      onRealCheckout={handleRealCheckout}
      isCheckoutPending={checkoutMutation.isPending}
    />
    <div className="flex min-h-screen bg-gradient-to-tr from-violet-50/40 via-zinc-50 to-indigo-50/40 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-zinc-800 dark:text-zinc-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <div className="md:hidden">
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <div className={`fixed top-0 bottom-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
          {sidebarContent}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Mobile Navbar */}
        <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white animate-float">
              <AudioLines className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">Voicey</span>
          </Link>
          <div className="flex items-center gap-2">
            {themeToggle}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
    </>
  );
}
