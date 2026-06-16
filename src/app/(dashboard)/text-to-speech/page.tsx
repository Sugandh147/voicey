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
  ArrowUpCircle,
  Globe,
  Wand2
} from "lucide-react";
import { toast } from "sonner";
import { rewriteTextForTone } from "@/lib/rewriter";

// High-fidelity list of major languages supported around the world
const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸", nativeName: "English" },
  { code: "es", name: "Spanish", flag: "🇪🇸", nativeName: "Español" },
  { code: "fr", name: "French", flag: "🇫🇷", nativeName: "Français" },
  { code: "de", name: "German", flag: "🇩🇪", nativeName: "Deutsch" },
  { code: "it", name: "Italian", flag: "🇮🇹", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹", nativeName: "Português" },
  { code: "ru", name: "Russian", flag: "🇷🇺", nativeName: "Русский" },
  { code: "zh-CN", name: "Chinese Simplified", flag: "🇨🇳", nativeName: "简体中文" },
  { code: "ja", name: "Japanese", flag: "🇯🇵", nativeName: "日本語" },
  { code: "ko", name: "Korean", flag: "🇰🇷", nativeName: "한국어" },
  { code: "hi", name: "Hindi", flag: "🇮🇳", nativeName: "हिन्दी" },
  { code: "ar", name: "Arabic", flag: "🇸🇦", nativeName: "العربية" },
  { code: "tr", name: "Turkish", flag: "🇹🇷", nativeName: "Türkçe" },
  { code: "nl", name: "Dutch", flag: "🇳🇱", nativeName: "Nederlands" },
  { code: "sv", name: "Swedish", flag: "🇸🇪", nativeName: "Svenska" },
  { code: "pl", name: "Polish", flag: "🇵🇱", nativeName: "Polski" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳", nativeName: "Tiếng Việt" },
  { code: "th", name: "Thai", flag: "🇹🇭", nativeName: "ไทย" },
  { code: "id", name: "Indonesian", flag: "🇮🇩", nativeName: "Bahasa Indonesia" },
  { code: "el", name: "Greek", flag: "🇬🇷", nativeName: "Ελληνικά" },
  { code: "he", name: "Hebrew", flag: "🇮🇱", nativeName: "עברית" },
  { code: "uk", name: "Ukrainian", flag: "🇺🇦", nativeName: "Українська" },
  { code: "ro", name: "Romanian", flag: "🇷🇴", nativeName: "Română" },
  { code: "hu", name: "Hungarian", flag: "🇭🇺", nativeName: "Magyar" },
  { code: "cs", name: "Czech", flag: "🇨🇿", nativeName: "Čeština" },
  { code: "da", name: "Danish", flag: "🇩🇰", nativeName: "Dansk" },
  { code: "fi", name: "Finnish", flag: "🇫🇮", nativeName: "Suomi" },
  { code: "no", name: "Norwegian", flag: "🇳🇴", nativeName: "Norsk" },
  { code: "fa", name: "Persian", flag: "🇮🇷", nativeName: "فارسی" },
  { code: "ur", name: "Urdu", flag: "🇵🇰", nativeName: "اردو" },
  { code: "bn", name: "Bengali", flag: "🇧🇩", nativeName: "বাংলা" },
  { code: "pa", name: "Punjabi", flag: "🇮🇳", nativeName: "ਪੰਜਾਬੀ" },
  { code: "ta", name: "Tamil", flag: "🇮🇳", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", flag: "🇮🇳", nativeName: "తెలుగు" },
  { code: "ml", name: "Malayalam", flag: "🇮🇳", nativeName: "മലയാളം" },
  { code: "ms", name: "Malay", flag: "🇲🇾", nativeName: "Bahasa Melayu" },
  { code: "fil", name: "Filipino", flag: "🇵🇭", nativeName: "Filipino" },
  { code: "sw", name: "Swahili", flag: "🇰🇪", nativeName: "Kiswahili" },
];

export default function TextToSpeechPage() {
  const [inputText, setInputText] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [exaggeration, setExaggeration] = useState(0.5);
  const [targetLang, setTargetLang] = useState("en");
  const [tone, setTone] = useState("podcast");
  const [autoRewrite, setAutoRewrite] = useState(false);
  const [activeAudio, setActiveAudio] = useState<{
    url: string;
    text: string;
    voiceName?: string;
    exaggeration?: number;
    lang?: string;
    tone?: string;
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

  // Handle auto-rewriting when tone changes
  useEffect(() => {
    if (autoRewrite && inputText.trim()) {
      const rewritten = rewriteTextForTone(inputText, tone);
      setInputText(rewritten);
      toast.info(`Script rewritten in ${tone} style!`);
    }
  }, [tone, autoRewrite]);

  // Limits
  const maxChars = planData?.plan === "PRO" ? 5000 : 500;
  const isOverLimit = inputText.length > maxChars;

  // Mutation
  const generateSpeechMutation = trpc.tts.generateSpeech.useMutation({
    onSuccess: (data) => {
      toast.success("Speech generated successfully!");
      
      // Load generated audio url, script text, and correct language
      setActiveAudio({
        url: data.url,
        text: data.text, // uses the translated text from backend!
        voiceName: selectedVoice?.name,
        exaggeration: exaggeration,
        lang: data.targetLang || targetLang,
        tone: data.tone || tone,
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
      targetLang,
      tone,
    });
  };

  const getAudioUrl = (r2Key: string) => {
    return `/api/audio/${r2Key}`;
  };

  const getLanguageDetails = (code: string) => {
    return SUPPORTED_LANGUAGES.find(l => l.code === code) || { name: code, flag: "🌐", nativeName: code };
  };

  const selectedVoice = voices?.find(v => v.id === selectedVoiceId);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-505">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-850 dark:text-zinc-100">Text to Speech</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mt-1">
          Synthesize high-fidelity voice files using our Chatterbox serverless engine.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Synthesis Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white/90 dark:bg-zinc-900/90 border-zinc-200/85 dark:border-zinc-805 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-zinc-750 dark:text-zinc-250">
                <Sparkles className="h-5 w-5 text-violet-500 animate-float" />
                Synthesis Configuration
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400 font-medium">Configure parameters for speech generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Text Input Area */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  <label htmlFor="tts-text">Enter Script</label>
                  <span className={`${isOverLimit ? "text-rose-600 font-extrabold" : "text-zinc-450 dark:text-zinc-500"}`}>
                    {inputText.length} / {maxChars} characters
                  </span>
                </div>
                <Textarea
                  id="tts-text"
                  placeholder="Type what you want generated, e.g., in English, Hindi, Spanish..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[140px] bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-violet-500/20 text-zinc-800 dark:text-zinc-250 placeholder:text-zinc-400 dark:placeholder:text-zinc-550 focus-visible:border-violet-300 font-medium"
                />

                {/* Text Rewriter Options */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5 border-t border-zinc-150 dark:border-zinc-850 mt-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="auto-rewrite-toggle"
                      checked={autoRewrite}
                      onChange={(e) => setAutoRewrite(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-800 text-violet-655 focus:ring-violet-500/25 cursor-pointer accent-violet-600"
                    />
                    <label htmlFor="auto-rewrite-toggle" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 cursor-pointer select-none">
                      Auto-Rewrite on Tone Change
                    </label>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      if (!inputText.trim()) {
                        toast.error("Please enter some text first.");
                        return;
                      }
                      const rewritten = rewriteTextForTone(inputText, tone);
                      setInputText(rewritten);
                      toast.success(`Rewritten for ${tone} tone!`);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold gap-1.5 border-zinc-250 dark:border-zinc-805 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-violet-500 animate-pulse" />
                    Rewrite to {tone} style
                  </Button>
                </div>
              </div>

              {/* Settings selectors */}
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Language Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Target Language</label>
                  <Select value={targetLang} onValueChange={setTargetLang}>
                    <SelectTrigger className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-violet-500/20 text-left text-zinc-805 dark:text-zinc-200 font-semibold focus:border-violet-300">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-lg max-h-[200px]">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="focus:bg-violet-50 dark:focus:bg-violet-955/40 cursor-pointer">
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Voice Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Select Voice Model</label>
                  {voicesLoading ? (
                    <Skeleton className="h-10 w-full bg-zinc-100 dark:bg-zinc-800" />
                  ) : (
                    <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                      <SelectTrigger className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-violet-500/20 text-left text-zinc-800 dark:text-zinc-200 font-semibold focus:border-violet-300">
                        <SelectValue placeholder="Select a voice model" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-lg">
                        {voices && voices.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="focus:bg-violet-50 dark:focus:bg-violet-950/40 focus:text-violet-900 dark:focus:text-violet-100 font-medium cursor-pointer">
                            <span className="flex items-center gap-2">
                              {v.name}
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                v.isSystem 
                                  ? "bg-violet-50 dark:bg-violet-950/45 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/50" 
                                  : "bg-fuchsia-50 dark:bg-fuchsia-950/45 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-100 dark:border-fuchsia-900/50"
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

                {/* Voice Tone Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Voice Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-violet-500/20 text-left text-zinc-805 dark:text-zinc-200 font-semibold focus:border-violet-300">
                      <SelectValue placeholder="Select Tone" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-lg">
                      <SelectItem value="podcast" className="focus:bg-violet-50 dark:focus:bg-violet-955/40 cursor-pointer font-medium">
                        🎙️ Podcast
                      </SelectItem>
                      <SelectItem value="cinematic" className="focus:bg-violet-50 dark:focus:bg-violet-955/40 cursor-pointer font-medium">
                        🎬 Cinematic
                      </SelectItem>
                      <SelectItem value="documentary" className="focus:bg-violet-50 dark:focus:bg-violet-955/40 cursor-pointer font-medium">
                        📽️ Documentary
                      </SelectItem>
                      <SelectItem value="conversational" className="focus:bg-violet-50 dark:focus:bg-violet-955/40 cursor-pointer font-medium">
                        💬 Conversational
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Exaggeration Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    <span>Emotion Exaggeration</span>
                    <span className="text-violet-650 dark:text-violet-400 font-extrabold">{exaggeration.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 px-1">
                    <Slider
                      value={[exaggeration]}
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      onValueChange={(val) => setExaggeration(val[0])}
                      className="[&>span:first-child]:bg-zinc-150 dark:[&>span:first-child]:bg-zinc-805 [&>span:first-child>span]:bg-violet-600"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-455 dark:text-zinc-500 font-bold mt-2">
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
                    <Skeleton className="h-4 w-4 rounded-full animate-spin border-2 border-zinc-205 dark:border-zinc-800 border-t-transparent bg-transparent" />
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
              <h3 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest px-1">Active Output Track</h3>
              <WaveformPlayer
                src={activeAudio.url}
                text={activeAudio.text}
                voiceName={activeAudio.voiceName}
                exaggeration={activeAudio.exaggeration}
                lang={activeAudio.lang}
                tone={activeAudio.tone}
              />
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-white/95 dark:bg-zinc-900/95 border-zinc-200/85 dark:border-zinc-800 p-5 text-sm space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300">
            <h4 className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-violet-500 animate-float" />
              Active Voice Spec
            </h4>
            {selectedVoice ? (
              <div className="space-y-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="font-bold text-zinc-805 dark:text-zinc-205">{selectedVoice.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="text-zinc-850 dark:text-zinc-205 font-bold">{selectedVoice.isSystem ? "Preloaded Studio" : "Zero-Shot Clone"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/45 border border-emerald-100 dark:border-emerald-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Ready
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-450 dark:text-zinc-500 font-bold">No voice selected. Select a model to view specs.</p>
            )}
          </Card>

          {planData?.plan === "FREE" && (
            <Card className="bg-gradient-to-tr from-violet-600/5 to-fuchsia-600/5 border border-violet-100 dark:border-violet-900/50 shadow-2xs hover:shadow-xs transition-shadow duration-300 p-5 space-y-3.5">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-violet-500 animate-float" />
                <h4 className="font-bold text-zinc-800 dark:text-zinc-250 text-sm">Need longer generations?</h4>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                Upgrade to Pro to increase character length limits from 500 characters up to <strong className="text-zinc-700 dark:text-zinc-300 font-bold">5,000 characters</strong> per query.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Generation History Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold tracking-tight text-zinc-850 dark:text-zinc-100 flex items-center gap-2">
          <History className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400 animate-float" />
          Generation History
        </h2>

        {genLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
            <Skeleton className="h-16 w-full bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
            <Skeleton className="h-16 w-full bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
          </div>
        ) : generations && generations.length > 0 ? (
          <div className="grid gap-3">
            {generations.map((gen: any) => {
              const audioUrl = getAudioUrl(gen.r2Key);
              const langDetails = getLanguageDetails(gen.targetLang || "en");
              return (
                <div 
                  key={gen.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-violet-200 dark:hover:border-violet-850 hover:shadow-xs shadow-xs rounded-xl gap-4 transition-all duration-300 hover:translate-x-0.5"
                >
                  <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                    <div className="h-9 w-9 rounded-lg bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0 border border-zinc-150 dark:border-zinc-800">
                      <Volume2 className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate text-zinc-850 dark:text-zinc-200">"{gen.text}"</p>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-455 font-bold mt-0.5">
                        <span className="text-zinc-650 dark:text-zinc-350 font-bold">Voice: {gen.voice?.name || "Deleted"}</span>
                        <span>•</span>
                        <span className="capitalize font-bold text-violet-650 dark:text-violet-400 bg-violet-50 dark:bg-violet-955/25 px-1.5 py-0.5 rounded border border-violet-100/50 dark:border-violet-900/40 text-[9px]">
                          {gen.tone === "cinematic" ? "🎬 Cinematic" : gen.tone === "documentary" ? "📽️ Documentary" : gen.tone === "conversational" ? "💬 Conversational" : "🎙️ Podcast"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
                          <Globe className="h-3 w-3 text-zinc-400" />
                          {langDetails.flag} {langDetails.name}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-zinc-400 dark:text-zinc-550" />
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
                          lang: gen.targetLang || "en",
                          tone: gen.tone || "podcast",
                        });
                        setTargetLang(gen.targetLang || "en");
                        setTone(gen.tone || "podcast");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      size="sm" 
                      variant="secondary"
                      className="bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-250 dark:border-zinc-750 hover:border-zinc-300 dark:hover:border-zinc-600 text-xs h-8 px-3.5 gap-1.5 active:scale-95 transition-all font-bold shadow-2xs"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Listen
                    </Button>
                    <a href={`${audioUrl}?download=true`} download={`voicey-gen-${gen.id}.mp3`}>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-zinc-455 dark:text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-205 hover:bg-zinc-100 dark:hover:bg-zinc-800 h-8 w-8 transition-colors duration-250"
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
          <div className="flex flex-col items-center justify-center p-12 bg-white/40 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center shadow-2xs">
            <AudioLines className="h-8 w-8 text-zinc-400 dark:text-zinc-500 mb-3 animate-float" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm font-medium">
              Your generation history is empty. Input text above and click Generate to synthesize speech.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
