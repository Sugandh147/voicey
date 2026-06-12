"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { WaveformPlayer } from "@/components/WaveformPlayer";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AudioLines, 
  Sparkles, 
  Volume2, 
  History, 
  Play, 
  Download, 
  Calendar,
  Layers,
  ArrowUpCircle
} from "lucide-react";
import { toast } from "sonner";

export default function TextToSpeechPage() {
  const [inputText, setInputText] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [exaggeration, setExaggeration] = useState(0.5);
  const [activeAudio, setActiveAudio] = useState<{
    url: string;
    text: string;
    voiceName?: string;
    exaggeration?: number;
  } | null>(null);

  // Queries
  const { data: planData, refetch: refetchPlan } = trpc.billing.getUserPlan.useQuery();
  const { data: voices, isLoading: voicesLoading } = trpc.voices.getVoices.useQuery();
  const { data: generations, isLoading: genLoading, refetch: refetchGen } = trpc.tts.getGenerations.useQuery();

  // Set default voice when loaded (supporting query parameters)
  useEffect(() => {
    if (voices && voices.length > 0 && !selectedVoiceId) {
      const params = new URLSearchParams(window.location.search);
      const queryVoiceId = params.get("voice");
      if (queryVoiceId && voices.some((v) => v.id === queryVoiceId)) {
        setSelectedVoiceId(queryVoiceId);
      } else {
        setSelectedVoiceId(voices[0].id);
      }
    }
  }, [voices, selectedVoiceId]);

  // Limits
  const maxChars = planData?.plan === "PRO" ? 5000 : 500;
  const isOverLimit = inputText.length > maxChars;

  // Mutation
  const generateSpeechMutation = trpc.tts.generateSpeech.useMutation({
    onSuccess: (data) => {
      toast.success("Speech generated successfully!");
      
      // Load generated audio url and script text
      setActiveAudio({
        url: data.url,
        text: inputText,
        voiceName: selectedVoice?.name,
        exaggeration: exaggeration,
      });
      
      // Refetch history and billing/usage count
      refetchGen();
      refetchPlan();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate speech. Please try again.");
    },
  });

  const handleGenerate = () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text to generate speech.");
      return;
    }
    if (!selectedVoiceId) {
      toast.error("Please select a voice first.");
      return;
    }
    if (isOverLimit) {
      toast.error(`Text length exceeds maximum allowed character limit (${maxChars} chars).`);
      return;
    }

    generateSpeechMutation.mutate({
      text: inputText,
      voiceId: selectedVoiceId,
      exaggeration,
    });
  };

  const getAudioUrl = (r2Key: string) => {
    // Return path to the audio proxy route
    return `/api/audio/${r2Key}`;
  };

  const selectedVoice = voices?.find(v => v.id === selectedVoiceId);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-505">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-850">Text to Speech</h1>
        <p className="text-zinc-500 text-sm font-medium mt-1">
          Synthesize high-fidelity voice files using our Chatterbox serverless engine.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Synthesis Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white/90 border-zinc-200/85 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-zinc-750">
                <Sparkles className="h-5 w-5 text-violet-500 animate-float" />
                Synthesis Configuration
              </CardTitle>
              <CardDescription className="text-zinc-500 font-medium">Configure parameters for speech generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Text Input Area */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-500">
                  <label htmlFor="tts-text">Enter Script</label>
                  <span className={`${isOverLimit ? "text-rose-600 font-extrabold" : "text-zinc-450"}`}>
                    {inputText.length} / {maxChars} characters
                  </span>
                </div>
                <Textarea
                  id="tts-text"
                  placeholder="Type or paste the text you want the AI to read..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[140px] bg-zinc-50 border-zinc-200 focus-visible:ring-violet-500/20 text-zinc-800 placeholder:text-zinc-400 focus-visible:border-violet-300 font-medium"
                />
              </div>

              {/* Settings selectors */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Voice Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500">Select Voice Model</label>
                  {voicesLoading ? (
                    <Skeleton className="h-10 w-full bg-zinc-100" />
                  ) : (
                    <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                      <SelectTrigger className="bg-zinc-50 border-zinc-200 focus:ring-violet-500/20 text-left text-zinc-800 font-semibold focus:border-violet-300">
                        <SelectValue placeholder="Select a voice model" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-zinc-200 text-zinc-800 shadow-lg">
                        {voices && voices.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="focus:bg-violet-50 focus:text-violet-900 font-medium cursor-pointer">
                            <span className="flex items-center gap-2">
                              {v.name}
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                v.isSystem 
                                  ? "bg-violet-50 text-violet-700 border border-violet-100" 
                                  : "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100"
                              }`}>
                                {v.isSystem ? "System" : "Custom"}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Exaggeration Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-zinc-500">
                    <span>Emotion Exaggeration</span>
                    <span className="text-violet-600 font-extrabold">{exaggeration.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 px-1">
                    <Slider
                      value={[exaggeration]}
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      onValueChange={(val) => setExaggeration(val[0])}
                      className="[&>span:first-child]:bg-zinc-150 [&>span:first-child>span]:bg-violet-600"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-450 font-bold mt-2">
                      <span>0.0 (Monotone)</span>
                      <span>1.0 (Expressive)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate Trigger */}
              <Button
                onClick={handleGenerate}
                disabled={generateSpeechMutation.isPending || !inputText.trim() || isOverLimit}
                className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-violet-500/10 hover:shadow-lg hover:shadow-violet-500/20 active:scale-98 transition-all duration-300 gap-2 cursor-pointer"
              >
                {generateSpeechMutation.isPending ? (
                  <>
                    <Skeleton className="h-4 w-4 rounded-full animate-spin border-2 border-zinc-200 border-t-transparent bg-transparent" />
                    Synthesizing Audio via GPU...
                  </>
                ) : (
                  <>
                    <AudioLines className="h-4.5 w-4.5" />
                    Generate Audio Speeches
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Active Audio Waveform Player */}
          {activeAudio && (
            <div className="space-y-2 animate-in slide-in-from-top-3 duration-250">
              <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest px-1">Active Output Track</h3>
              <WaveformPlayer
                src={activeAudio.url}
                text={activeAudio.text}
                voiceName={activeAudio.voiceName}
                exaggeration={activeAudio.exaggeration}
              />
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-white/95 border-zinc-200/85 p-5 text-sm space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300">
            <h4 className="font-bold text-zinc-700 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-violet-500 animate-float" />
              Active Voice Spec
            </h4>
            {selectedVoice ? (
              <div className="space-y-2 text-zinc-500 text-xs font-semibold">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="font-bold text-zinc-800">{selectedVoice.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="text-zinc-800 font-bold">{selectedVoice.isSystem ? "Preloaded Studio" : "Zero-Shot Clone"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Ready
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-450 font-bold">No voice selected. Select a model to view specs.</p>
            )}
          </Card>

          {planData?.plan === "FREE" && (
            <Card className="bg-gradient-to-tr from-violet-600/5 to-fuchsia-600/5 border border-violet-100 shadow-2xs hover:shadow-xs transition-shadow duration-300 p-5 space-y-3.5">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-violet-500 animate-float" />
                <h4 className="font-bold text-zinc-800 text-sm">Need longer generations?</h4>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Upgrade to Pro to increase character length limits from 500 characters up to <strong className="text-zinc-700 font-bold">5,000 characters</strong> per query.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Generation History Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold tracking-tight text-zinc-850 flex items-center gap-2">
          <History className="h-4.5 w-4.5 text-zinc-500 animate-float" />
          Generation History
        </h2>

        {genLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full bg-zinc-200/60 animate-pulse" />
            <Skeleton className="h-16 w-full bg-zinc-200/60 animate-pulse" />
            <Skeleton className="h-16 w-full bg-zinc-200/60 animate-pulse" />
          </div>
        ) : generations && generations.length > 0 ? (
          <div className="grid gap-3">
            {generations.map((gen) => {
              const audioUrl = getAudioUrl(gen.r2Key);
              return (
                <div 
                  key={gen.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border border-zinc-200 hover:border-violet-200 hover:shadow-xs shadow-xs rounded-xl gap-4 transition-all duration-300 hover:translate-x-0.5"
                >
                  <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                    <div className="h-9 w-9 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-500 shrink-0 border border-zinc-150">
                      <Volume2 className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate text-zinc-850">"{gen.text}"</p>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-zinc-500 font-bold mt-0.5">
                        <span className="text-zinc-650 font-bold">Voice: {gen.voice?.name || "Deleted"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-zinc-400" />
                          {new Date(gen.createdAt).toLocaleDateString()}
                        </span>
                        {gen.duration && (
                          <>
                            <span>•</span>
                            <span>Duration: {gen.duration}s</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button 
                      onClick={() => {
                        setActiveAudio({
                          url: audioUrl,
                          text: gen.text,
                          voiceName: gen.voice?.name,
                          exaggeration: 0.5,
                        });
                        // Scroll up to the player
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      size="sm" 
                      variant="secondary"
                      className="bg-zinc-50 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-250 hover:border-zinc-300 text-xs h-8 px-3.5 gap-1.5 active:scale-95 transition-all font-bold shadow-2xs"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Listen
                    </Button>
                    <a href={audioUrl} download={`voicey-gen-${gen.id}.wav`}>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-zinc-450 hover:text-zinc-700 hover:bg-zinc-100 h-8 w-8 transition-colors duration-250"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white/40 border border-dashed border-zinc-200 rounded-2xl text-center shadow-2xs">
            <AudioLines className="h-8 w-8 text-zinc-400 mb-3 animate-float" />
            <p className="text-sm text-zinc-500 max-w-sm font-medium">
              Your generation history is empty. Input text above and click Generate to synthesize speech.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
