"use client";

import React, { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Mic, 
  Play, 
  Trash2, 
  History, 
  Sparkles, 
  ArrowRight, 
  Languages,
  Volume2, 
  Loader2, 
  Globe,
  MicOff,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

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

export default function SpeechTranslationPage() {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Queries & Mutations
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = trpc.translation.getTranslations.useQuery();
  const translateTextMutation = trpc.translation.translateText.useMutation();
  const createTranslationMutation = trpc.translation.createTranslation.useMutation();
  const deleteTranslationMutation = trpc.translation.deleteTranslation.useMutation({
    onSuccess: () => {
      toast.success("Translation deleted from history.");
      refetchHistory();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete item.");
    }
  });

  // Load browser speech synthesis voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        setSpeechVoices(window.speechSynthesis.getVoices());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Initialize browser Web Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = sourceLang;

        rec.onstart = () => {
          setRecognitionActive(true);
        };

        rec.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setSourceText((prev) => {
              const cleanedPrev = prev.trim();
              return cleanedPrev ? `${cleanedPrev} ${finalTranscript.trim()}` : finalTranscript.trim();
            });
          }
        };

        rec.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          if (event.error === "not-allowed") {
            toast.error("Microphone access denied. Please grant microphone permissions.");
          } else {
            toast.error(`Speech recognition encountered an error: ${event.error}`);
          }
          setIsRecording(false);
        };

        rec.onend = () => {
          setRecognitionActive(false);
          setIsRecording(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, [sourceLang]);

  // Adjust recognition language dynamically when sourceLang selector updates
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = sourceLang;
      if (isRecording) {
        // Restart recognition with new language
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current.start();
        }, 300);
      }
    }
  }, [sourceLang, isRecording]);

  // Start / Stop Speech Recognition
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Web Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.success("Recording stopped. Feel free to refine the text before translating.");
    } else {
      setSourceText(""); // Reset
      setTranslatedText("");
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast.info("Microphone is active. Speak clearly...");
      } catch (err) {
        console.error("Failed to start Speech Recognition:", err);
      }
    }
  };

  // Perform translation
  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast.error("Please provide some text or speak into your microphone to translate.");
      return;
    }

    const loaderId = toast.loading("Translating and processing text...");
    try {
      const res = await translateTextMutation.mutateAsync({
        text: sourceText,
        sourceLang,
        targetLang,
      });

      setTranslatedText(res.translatedText);

      // Save translation record to database
      await createTranslationMutation.mutateAsync({
        sourceText,
        sourceLang,
        targetText: res.translatedText,
        targetLang,
      });

      toast.success("Translation completed successfully!", { id: loaderId });
      refetchHistory();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to translate speech.", { id: loaderId });
    }
  };

  // Speaks translated text in target language
  const handlePlayVoice = (textToSpeak: string, langCode: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Speech Synthesis is not supported in this browser.");
      return;
    }

    setIsPlaying(true);
    window.speechSynthesis.cancel(); // Stop active voices

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langCode;

    // Search for best matching voice in target language
    const match = speechVoices.find(v => 
      v.lang.toLowerCase() === langCode.toLowerCase() ||
      v.lang.toLowerCase().startsWith(langCode.toLowerCase() + "-") ||
      v.lang.toLowerCase().startsWith(langCode.toLowerCase())
    );

    if (match) {
      utterance.voice = match;
    }

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const getLanguageDetails = (code: string) => {
    return SUPPORTED_LANGUAGES.find(l => l.code === code) || { name: code, flag: "🌐", nativeName: code };
  };

  const handleSwapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setSourceText(translatedText);
    setTranslatedText("");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-505">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-850 dark:text-zinc-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
            <Languages className="h-5.5 w-5.5 animate-float" />
          </div>
          Speech Translator
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mt-1">
          Translate speech and text between dozens of world languages instantly with voice playback.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Main Translator Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white/90 dark:bg-zinc-900/90 border-zinc-200/85 dark:border-zinc-805 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-zinc-750 dark:text-zinc-250">
                <Sparkles className="h-5 w-5 text-violet-500 animate-pulse" />
                Translation Console
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language Selection Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-150 dark:border-zinc-850">
                {/* Source Language */}
                <div className="w-full">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest block mb-1">From</label>
                  <Select value={sourceLang} onValueChange={setSourceLang}>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold h-10">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-xl max-h-[300px]">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="focus:bg-violet-50 dark:focus:bg-violet-950/40 cursor-pointer">
                          <span className="flex items-center gap-2 font-medium">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">({lang.nativeName})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Swap Button */}
                <Button 
                  onClick={handleSwapLanguages} 
                  variant="ghost" 
                  size="icon" 
                  className="shrink-0 h-9 w-9 rounded-lg hover:bg-zinc-150 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mt-4 active:scale-95 transition-all"
                  title="Swap languages"
                >
                  <RefreshCw className="h-4.5 w-4.5" />
                </Button>

                {/* Target Language */}
                <div className="w-full">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest block mb-1">To</label>
                  <Select value={targetLang} onValueChange={setTargetLang}>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold h-10">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-xl max-h-[300px]">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="focus:bg-violet-50 dark:focus:bg-violet-950/40 cursor-pointer">
                          <span className="flex items-center gap-2 font-medium">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">({lang.nativeName})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Input Area and Recording */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  <label htmlFor="source-text">Original Speech / Text</label>
                  {isRecording && (
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-450 font-extrabold animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-rose-600 dark:bg-rose-500 animate-ping" />
                      Listening in Real-time...
                    </span>
                  )}
                </div>
                
                <div className="relative">
                  <Textarea
                    id="source-text"
                    placeholder="Click record to transcribe your voice, or type text directly here..."
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    className="min-h-[120px] pr-12 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-250 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-violet-500/20 focus-visible:border-violet-300 font-medium leading-relaxed"
                  />
                  
                  {/* Mic Trigger */}
                  <Button
                    onClick={toggleRecording}
                    variant="ghost"
                    size="icon"
                    className={`absolute bottom-3 right-3 h-9 w-9 rounded-full transition-all ${
                      isRecording 
                        ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/25 scale-105" 
                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-150 dark:hover:bg-zinc-800"
                    }`}
                    title={isRecording ? "Stop recording" : "Record your speech"}
                  >
                    {isRecording ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                  </Button>
                </div>
              </div>

              {/* Translate Action */}
              <Button
                onClick={handleTranslate}
                disabled={translateTextMutation.isPending || !sourceText.trim()}
                className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-violet-500/10 hover:shadow-lg hover:shadow-violet-500/20 active:scale-98 transition-all duration-300 gap-2 cursor-pointer"
              >
                {translateTextMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Translating Multilingual Speech...
                  </>
                ) : (
                  <>
                    <Languages className="h-4.5 w-4.5" />
                    Translate Speech
                  </>
                )}
              </Button>

              {/* Translation Output Card */}
              {translatedText && (
                <div className="pt-2 animate-in fade-in duration-300">
                  <div className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100/80 dark:border-violet-900/50 rounded-xl p-4.5 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-violet-600 dark:text-violet-400">
                      <span>Translated Text ({getLanguageDetails(targetLang).name})</span>
                      <Button
                        onClick={() => handlePlayVoice(translatedText, targetLang)}
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-500 text-white font-bold h-8 text-xs gap-1.5 px-3 shadow-xs active:scale-95 transition-all shrink-0"
                      >
                        <Volume2 className={`h-3.5 w-3.5 ${isPlaying ? "animate-bounce" : ""}`} />
                        Speak Out Loud
                      </Button>
                    </div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {translatedText}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar specs/info */}
        <div className="space-y-6">
          <Card className="bg-white/95 dark:bg-zinc-900/95 border-zinc-200/85 dark:border-zinc-800 p-5 text-sm space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300">
            <h4 className="font-bold text-zinc-700 dark:text-zinc-350 flex items-center gap-1.5">
              <Globe className="h-4.5 w-4.5 text-violet-500 animate-float" />
              Translator Engine Info
            </h4>
            <div className="space-y-3 text-zinc-500 dark:text-zinc-400 text-xs font-semibold leading-relaxed">
              <p>
                Our speech translation system relies on your device's browser capabilities for real-time speech-to-text.
              </p>
              <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-800">
                <span className="font-bold text-zinc-700 dark:text-zinc-350">Accented Playback:</span>
                <span className="text-emerald-600 dark:text-emerald-450 font-bold">Enabled</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-800">
                <span className="font-bold text-zinc-700 dark:text-zinc-350">Speech Recognition:</span>
                <span className="text-emerald-600 dark:text-emerald-450 font-bold">Supported</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Translation History Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold tracking-tight text-zinc-850 dark:text-zinc-100 flex items-center gap-2">
          <History className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400 animate-float" />
          Translation History
        </h2>

        {historyLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
            <Skeleton className="h-20 w-full bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
          </div>
        ) : history && history.length > 0 ? (
          <div className="grid gap-3">
            {history.map((item: any) => {
              const srcDetails = getLanguageDetails(item.sourceLang);
              const tgtDetails = getLanguageDetails(item.targetLang);
              return (
                <div 
                  key={item.id}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center p-4.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-violet-200 dark:hover:border-violet-850 hover:shadow-xs shadow-xs rounded-xl gap-4 transition-all duration-300 hover:translate-x-0.5"
                >
                  <div className="flex-1 space-y-2 min-w-0 w-full">
                    {/* Lang code header badges */}
                    <div className="flex items-center gap-2.5 text-[10px] text-zinc-450 dark:text-zinc-500 font-extrabold uppercase">
                      <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-800/60 text-zinc-650 dark:text-zinc-400">
                        {srcDetails.flag} {srcDetails.name}
                      </span>
                      <ArrowRight className="h-3 w-3 text-zinc-400" />
                      <span className="flex items-center gap-1 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded border border-violet-100/50 dark:border-violet-900/40 text-violet-750 dark:text-violet-300">
                        {tgtDetails.flag} {tgtDetails.name}
                      </span>
                    </div>

                    {/* Side-by-side or stacked texts */}
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 block">Original</span>
                        <p className="font-semibold text-zinc-700 dark:text-zinc-350 truncate">"{item.sourceText}"</p>
                      </div>
                      <div className="border-t sm:border-t-0 sm:border-l border-zinc-100 dark:border-zinc-850 pt-2 sm:pt-0 sm:pl-3">
                        <span className="text-[10px] font-bold text-violet-500/80 dark:text-violet-400/80 block">Translated</span>
                        <p className="font-extrabold text-violet-650 dark:text-violet-300 truncate">"{item.targetText}"</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button 
                      onClick={() => handlePlayVoice(item.targetText, item.targetLang)}
                      size="sm" 
                      variant="secondary"
                      className="bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-250 dark:border-zinc-750 hover:border-zinc-300 dark:hover:border-zinc-600 text-xs h-8 px-3.5 gap-1.5 active:scale-95 transition-all font-bold shadow-2xs"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Replay
                    </Button>
                    <Button 
                      onClick={() => {
                        if (confirm("Are you sure you want to remove this translation from history?")) {
                          deleteTranslationMutation.mutate({ id: item.id });
                        }
                      }}
                      disabled={deleteTranslationMutation.isPending}
                      size="sm" 
                      variant="ghost"
                      className="text-zinc-450 dark:text-zinc-500 hover:text-rose-600 hover:bg-rose-500/10 h-8 w-8 rounded-lg transition-colors"
                      title="Delete Translation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white/40 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center shadow-2xs">
            <Languages className="h-8 w-8 text-zinc-400 dark:text-zinc-500 mb-3 animate-float" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs font-medium">
              No translation history yet. Enter your text and translate to see history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
