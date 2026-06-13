"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc";
import { 
  Zap, 
  Mic, 
  AudioLines, 
  History, 
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ProUpgradeModal from "@/components/ProUpgradeModal";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Fetch plan and usage
  const { data: planData, isLoading: planLoading } = trpc.billing.getUserPlan.useQuery();
  // Fetch history limit to 3 recent items
  const { data: generations, isLoading: genLoading } = trpc.tts.getGenerations.useQuery();

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
    const successUrl = window.location.origin;
    checkoutMutation.mutate({ successUrl });
  };

  const usageCount = planData?.usageCount || 0;
  const usageLimit = planData?.plan === "PRO" ? Infinity : 10;
  const usagePercentage = usageLimit === Infinity ? 0 : Math.min((usageCount / usageLimit) * 100, 100);

  return (
    <>
    <ProUpgradeModal
      open={upgradeModalOpen}
      onClose={() => setUpgradeModalOpen(false)}
      onRealCheckout={handleRealCheckout}
      isCheckoutPending={checkoutMutation.isPending}
    />
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-505">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/95 border border-zinc-200/85 p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl animate-pulse" />
        <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-fuchsia-200/30 blur-3xl" />
        
        <div className="space-y-2 relative z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-850">
            Hello, <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{user?.firstName || "Creator"}</span> 👋
          </h1>
          <p className="text-zinc-500 text-sm max-w-lg font-medium leading-relaxed">
            Welcome to your self-hosted AI voice workstation. Synthesize realistic voice synthesis and manage custom voice clones.
          </p>
        </div>
        <div className="flex gap-3 relative z-10 shrink-0">
          <Link href="/text-to-speech">
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold gap-1.5 h-10 px-4 active:scale-98 transition-all duration-300 shadow-md shadow-violet-500/10 hover:shadow-lg hover:shadow-violet-500/20">
              <AudioLines className="h-4.5 w-4.5 animate-float" />
              Generate Speech
            </Button>
          </Link>
          <Link href="/voices">
            <Button variant="outline" className="border-zinc-250 bg-white hover:bg-zinc-50 text-zinc-650 hover:text-zinc-850 font-semibold gap-1.5 h-10 px-4 active:scale-98 transition-all duration-300">
              <Mic className="h-4.5 w-4.5 text-zinc-500" />
              Clone Voice
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Usage Card */}
        <Card className="col-span-1 md:col-span-2 bg-white/90 border-zinc-200/85 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-350">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-violet-500 animate-float" />
              Usage Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {planLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/3 bg-zinc-200" />
                <Skeleton className="h-6 w-full bg-zinc-200" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-3xl font-black text-zinc-850">{usageCount}</span>
                    <span className="text-zinc-450 font-bold ml-1">
                      / {usageLimit === Infinity ? "Unlimited" : `${usageLimit} generations`}
                    </span>
                  </div>
                  <span className="text-xs text-violet-650 bg-violet-50 px-2.5 py-0.5 rounded-full font-extrabold border border-violet-100">
                    {planData?.plan} Plan
                  </span>
                </div>
                {usageLimit !== Infinity && (
                  <div className="space-y-2.5">
                    <Progress value={usagePercentage} className="h-2.5 bg-zinc-100 [&>div]:bg-gradient-to-r [&>div]:from-violet-600 [&>div]:to-fuchsia-500" />
                    <div className="flex justify-between text-[10px] text-zinc-450 font-bold">
                      <span>{Math.round(usagePercentage)}% used</span>
                      <span>{usageLimit - usageCount} remaining</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
          {planData?.plan === "FREE" && (
            <CardFooter className="border-t border-zinc-150 pt-4 mt-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
                <span className="text-xs text-zinc-500 font-medium">Upgrade to Pro for unlimited generation usage limit.</span>
                <Button 
                  onClick={handleUpgrade}
                  disabled={checkoutMutation.isPending}
                  size="sm" 
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs gap-1.5 h-8.5 px-3 active:scale-98 transition-all shadow-xs shadow-violet-500/10"
                >
                  {checkoutMutation.isPending ? (
                    <Skeleton className="h-3 w-16 bg-violet-400/50" />
                  ) : (
                    <>
                      <Zap className="h-3 w-3 fill-current animate-pulse" />
                      Upgrade Now
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Quick Insights */}
        <Card className="bg-white/90 border-zinc-200/85 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-350 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-zinc-500 tracking-wider uppercase flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-fuchsia-500" />
              AI Inference Node
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-500 space-y-3.5 leading-relaxed font-medium">
            <p>
              Inference is handled serverless on Modal with <strong className="text-zinc-800 font-bold">A10G GPU acceleration</strong>. 
            </p>
            <div className="flex items-center gap-2.5 bg-zinc-50 p-2.5 border border-zinc-150 rounded-lg animate-pulse-glow">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="font-bold text-zinc-850">Chatterbox TTS</p>
                <p className="text-[10px] text-zinc-450 font-bold">Latency: ~200ms</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-zinc-150 pt-4">
            <a 
              href="https://github.com/resemble-ai/chatterbox" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-violet-600 hover:text-violet-500 font-bold inline-flex items-center gap-1 transition-all"
            >
              Open Chatterbox GitHub
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </CardFooter>
        </Card>
      </div>

      {/* Model Tech Pipeline */}
      <div className="bg-white/40 border border-zinc-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <h3 className="text-sm font-bold text-zinc-700 mb-6 flex items-center gap-2 relative z-10">
          <Layers className="h-4.5 w-4.5 text-violet-500" />
          The Voicey Processing Pipeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center relative z-10">
          <div className="bg-white border border-zinc-150 hover:border-violet-300 hover:shadow-md rounded-xl p-4 flex flex-col items-center justify-center space-y-2 transition-all duration-300 hover:-translate-y-0.5">
            <div className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest">Step 1</div>
            <div className="font-extrabold text-zinc-850 text-sm">Text Input</div>
            <div className="text-[10px] text-zinc-450 font-medium">Form validation and sanitization</div>
          </div>
          <div className="bg-white border border-zinc-150 hover:border-violet-300 hover:shadow-md rounded-xl p-4 flex flex-col items-center justify-center space-y-2 transition-all duration-300 hover:-translate-y-0.5">
            <div className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest">Step 2</div>
            <div className="font-extrabold text-zinc-850 text-sm">Preprocessing</div>
            <div className="text-[10px] text-zinc-450 font-medium">Syntactic analysis and normalization</div>
          </div>
          <div className="bg-white border border-zinc-150 hover:border-violet-300 hover:shadow-md rounded-xl p-4 flex flex-col items-center justify-center space-y-2 transition-all duration-300 hover:-translate-y-0.5">
            <div className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest">Step 3</div>
            <div className="font-extrabold text-zinc-850 text-sm">Chatterbox GPU</div>
            <div className="text-[10px] text-zinc-450 font-medium">Modal container synthesizes audio</div>
          </div>
          <div className="bg-white border border-zinc-150 hover:border-violet-300 hover:shadow-md rounded-xl p-4 flex flex-col items-center justify-center space-y-2 transition-all duration-300 hover:-translate-y-0.5">
            <div className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest">Step 4</div>
            <div className="font-extrabold text-zinc-850 text-sm">Waveform Synthesis</div>
            <div className="text-[10px] text-zinc-450 font-medium">Audio playback & WAV streaming</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold tracking-tight text-zinc-850 flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-zinc-500 animate-float" />
            Recent Generations
          </h2>
          {generations && generations.length > 0 && (
            <Link href="/text-to-speech" className="text-xs text-violet-650 hover:text-violet-500 font-extrabold inline-flex items-center gap-0.5 transition-colors duration-200">
              View History
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {genLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full bg-zinc-200/60 animate-pulse" />
            <Skeleton className="h-16 w-full bg-zinc-200/60 animate-pulse" />
          </div>
        ) : generations && generations.length > 0 ? (
          <div className="grid gap-3">
            {generations.slice(0, 3).map((gen) => (
              <div 
                key={gen.id}
                className="flex justify-between items-center p-4 bg-white/95 border border-zinc-200/85 hover:border-violet-250 hover:shadow-xs rounded-xl shadow-xs transition-all duration-300 hover:translate-x-0.5"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-500 flex-shrink-0 border border-zinc-150">
                    <Volume2 className="h-4.5 w-4.5 text-zinc-500 animate-float" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate text-zinc-850 pr-4">"{gen.text}"</p>
                    <p className="text-[10px] text-zinc-550 font-bold">
                      Voice: <strong className="text-zinc-700 font-bold">{gen.voice?.name || "Deleted"}</strong> • {new Date(gen.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {gen.duration && (
                  <span className="text-xs text-zinc-500 bg-zinc-50 px-2.5 py-0.5 rounded-full border border-zinc-200/60 font-bold flex-shrink-0 shadow-2xs">
                    {gen.duration}s
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-white/40 border border-dashed border-zinc-200 rounded-xl text-center shadow-2xs">
            <p className="text-sm text-zinc-500 mb-4 font-medium">No speech generations yet. Write some text to get started.</p>
            <Link href="/text-to-speech">
              <Button size="sm" className="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white font-semibold border border-zinc-700 h-9 active:scale-95 transition-all">
                Generate First Audio
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
