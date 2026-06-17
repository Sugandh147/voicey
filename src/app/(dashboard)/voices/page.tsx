"use client";

import React, { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Mic, 
  Trash2, 
  UploadCloud, 
  Sparkles, 
  Volume2, 
  Loader2, 
  Plus,
  PlayCircle,
  Square
} from "lucide-react";
import { toast } from "sonner";

export default function VoicesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [voiceName, setVoiceName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  // Microphone recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Queries & Mutations
  const { data: voices, isLoading: voicesLoading, refetch: refetchVoices } = trpc.voices.getVoices.useQuery();
  const getPresignedUrlMutation = trpc.voices.getPresignedUploadUrl.useMutation();
  const createVoiceMutation = trpc.voices.createVoice.useMutation();
  const deleteVoiceMutation = trpc.voices.deleteVoice.useMutation({
    onSuccess: () => {
      toast.success("Voice deleted successfully.");
      refetchVoices();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete voice.");
    }
  });

  // Handle Dialog reset on close
  useEffect(() => {
    if (!isDialogOpen) {
      setVoiceName("");
      setUploadFile(null);
      resetRecorder();
    }
  }, [isDialogOpen]);

  const resetRecorder = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setRecordedBlob(null);
    setRecordingSeconds(0);
    setRecordedUrl(null);
    mediaRecorderRef.current = null;
    streamRef.current = null;
  };

  // Start microphone recording
  const startRecording = async () => {
    try {
      resetRecorder();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Timer setup
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
      
      toast.info("Recording started. Talk clearly into your microphone.");
    } catch (error) {
      console.error("Microphone access error:", error);
      toast.error("Could not access microphone. Ensure permissions are granted.");
    }
  };

  // Stop microphone recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      toast.success("Recording completed. Review your sample below.");
    }
  };

  // Main Submit handler
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleCloneVoice = async () => {
    if (!voiceName.trim()) {
      toast.error("Please provide a name for the custom voice.");
      return;
    }
    
    let sampleBlob: Blob | File | null = null;
    let filename = "sample.wav";
    let contentType = "audio/wav";

    if (uploadFile) {
      sampleBlob = uploadFile;
      filename = uploadFile.name;
      contentType = uploadFile.type || "audio/wav";
    } else if (recordedBlob) {
      sampleBlob = recordedBlob;
      filename = "recording.wav";
      contentType = "audio/wav";
    }

    if (!sampleBlob) {
      toast.error("Please either upload an audio sample or record one.");
      return;
    }

    setIsSubmitting(true);
    const loadingToastId = toast.loading("Uploading voice sample and cloning model...");

    try {
      // 1. Get presigned R2 upload URL
      const { uploadUrl, r2Key } = await getPresignedUrlMutation.mutateAsync({
        filename,
        contentType,
      });

      // 2. Put file to R2 directly
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: sampleBlob,
      });

      if (!response.ok) {
        throw new Error("Failed to write voice sample payload to R2.");
      }

      // 3. Save voice database record
      await createVoiceMutation.mutateAsync({
        name: voiceName,
        r2Key,
      });

      toast.success("Voice successfully added to library!", { id: loadingToastId });
      setIsDialogOpen(false);
      refetchVoices();
    } catch (error: any) {
      console.error("Cloning error:", error);
      toast.error(error.message || "Failed to clone voice sample. Please try again.", { id: loadingToastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      deleteVoiceMutation.mutate({ id });
    }
  };

  const formatSeconds = (sec: number) => {
    return `0:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-505">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-850 dark:text-zinc-100">Voice Library</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mt-1">
            Manage your preloaded system voices and upload audio samples to clone custom voices.
          </p>
        </div>
        
        {/* Dialog to Add/Clone Voice */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold gap-1.5 h-10 px-4 active:scale-98 transition-all duration-300 shadow-md shadow-violet-500/10 hover:shadow-lg hover:shadow-violet-500/20 cursor-pointer">
              <Plus className="h-4.5 w-4.5" />
              Add Custom Voice
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Clone New Voice</DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
                Upload or record a 5–30s high-quality WAV/MP3 voice sample. Our zero-shot engine will model the voice characteristics automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Voice Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Voice Identifier Name</label>
                <Input 
                  placeholder="e.g. Morgan's Clone" 
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-855 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-550 focus-visible:ring-violet-500/20 focus-visible:border-violet-300 font-semibold"
                />
              </div>

              {/* Upload vs Record Switch */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Voice Sample (choose one)</label>
                
                {/* Method 1: File upload */}
                <div className="border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40 rounded-xl p-4 flex flex-col items-center justify-center text-center relative hover:border-violet-300 dark:hover:border-violet-850 transition-all duration-300">
                  <Input 
                    type="file" 
                    accept="audio/wav,audio/mp3,audio/mpeg,audio/x-wav"
                    disabled={isRecording}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        setRecordedBlob(null); // Clear recording
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <UploadCloud className="h-8 w-8 text-zinc-450 dark:text-zinc-500 mb-2 animate-float" />
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {uploadFile ? uploadFile.name : "Upload audio sample"}
                  </p>
                  <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold mt-1">WAV or MP3, max 30s</p>
                </div>

                <div className="relative flex py-1.5 items-center">
                  <div className="flex-grow border-t border-zinc-150 dark:border-zinc-800"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">or</span>
                  <div className="flex-grow border-t border-zinc-150 dark:border-zinc-800"></div>
                </div>

                {/* Method 2: Microphone recorder */}
                <div className={`bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center space-y-3 transition-all ${isRecording ? "animate-pulse-glow border-rose-300 dark:border-rose-900/40" : ""}`}>
                  <div className="flex items-center gap-3">
                    {isRecording ? (
                      <Button 
                        onClick={stopRecording} 
                        size="sm"
                        variant="destructive"
                        className="h-9 gap-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-sm shadow-rose-500/10"
                      >
                        <Square className="h-4 w-4 fill-current animate-pulse" />
                        Stop ({formatSeconds(recordingSeconds)})
                      </Button>
                    ) : (
                      <Button 
                        onClick={startRecording}
                        disabled={!!uploadFile}
                        size="sm"
                        variant="secondary"
                        className="bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-250 dark:border-zinc-800 h-9 gap-1.5 px-3 active:scale-95 transition-all duration-300 font-semibold shadow-2xs cursor-pointer"
                      >
                        <Mic className="h-4 w-4 text-zinc-550 dark:text-zinc-400 animate-float" />
                        Record Live Mic
                      </Button>
                    )}
                  </div>
                  
                  {recordedUrl && (
                    <div className="w-full pt-1.5 flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 px-3 animate-in fade-in duration-200 shadow-2xs">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-450 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                        <Volume2 className="h-3.5 w-3.5 text-violet-500" />
                        Mic Sample Ready
                      </span>
                      <audio src={recordedUrl} controls className="h-7 w-40 select-none outline-none scale-90" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-zinc-150 dark:border-zinc-800 pt-4">
              <Button 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCloneVoice}
                disabled={isSubmitting || !voiceName.trim() || (!uploadFile && !recordedBlob)}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold gap-1.5 shadow-md shadow-violet-500/10 cursor-pointer duration-300"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Clone Voice
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid of Voices */}
      {voicesLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <Skeleton className="h-44 w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded-2xl animate-pulse" />
          <Skeleton className="h-44 w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded-2xl animate-pulse" />
          <Skeleton className="h-44 w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded-2xl animate-pulse" />
        </div>
      ) : voices && voices.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {voices.map((voice) => (
            <Card 
              key={voice.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-800 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md overflow-hidden group hover:-translate-y-1 transition-all duration-300 relative"
            >
              <CardHeader className="pb-3 relative">
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded border ${
                    voice.isSystem 
                      ? "bg-violet-50 dark:bg-violet-955/40 text-violet-700 dark:text-violet-300 border-violet-100 dark:border-violet-900/50" 
                      : "bg-fuchsia-50 dark:bg-fuchsia-955/40 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-100 dark:border-fuchsia-900/50"
                  }`}>
                    {voice.isSystem ? "System Preset" : "Custom Clone"}
                  </span>
                  
                  {!voice.isSystem && (
                    <Button 
                      onClick={() => handleDelete(voice.id, voice.name)}
                      disabled={deleteVoiceMutation.isPending}
                      variant="ghost" 
                      size="icon"
                      className="text-zinc-400 dark:text-zinc-500 hover:text-rose-600 hover:bg-rose-500/10 h-7 w-7 rounded-lg active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100 mt-2">{voice.name}</CardTitle>
                <CardDescription className="text-zinc-400 dark:text-zinc-500 text-[11px] font-semibold">
                  {voice.isSystem ? "Built-in voice pre-loaded" : `Created on ${new Date(voice.createdAt).toLocaleDateString()}`}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pb-4">
                <div className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                  <PlayCircle className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500 animate-float" />
                  <span>Ready for zero-shot synthesis</span>
                </div>
              </CardContent>

              <CardFooter className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/40 dark:bg-zinc-950/20 flex gap-2">
                <a 
                  href={`/text-to-speech?voice=${voice.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info(`Selected ${voice.name} model. Redirecting...`);
                    setTimeout(() => {
                      window.location.href = `/text-to-speech?voice=${voice.id}`;
                    }, 500);
                  }}
                  className="w-full"
                >
                  <Button 
                    variant="secondary"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs h-8.5 gap-1.5 active:scale-95 transition-all font-bold shadow-2xs cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                    Use Voice
                  </Button>
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 bg-white/40 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center shadow-xs">
          <Mic className="h-10 w-10 text-zinc-400 dark:text-zinc-500 mb-4 animate-float" />
          <h3 className="font-bold text-zinc-700 dark:text-zinc-200 mb-1">Your voice library is empty</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-4 font-semibold">
            Upload custom WAV/MP3 samples or use your microphone to clone a voice model.
          </p>
        </div>
      )}
    </div>
  );
}
