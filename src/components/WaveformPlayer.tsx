"use client";

import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, Download, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

function speakFallbackText(
  text: string,
  voiceName?: string,
  exaggeration: number = 0.5,
  onEnd?: () => void,
  onError?: () => void
) {
  window.speechSynthesis.cancel();

  // Preprocess script text based on exaggeration to simulate emotional cadence
  let processedText = text;
  if (exaggeration > 0.75) {
    // Inject ellipses to create dramatic/expressive pauses, and exclamation points
    processedText = text
      .replace(/(\. )/g, "... ")
      .replace(/(\!)/g, "!!! ")
      .replace(/(\?)/g, "!? ");
  } else if (exaggeration < 0.25) {
    // Remove dramatic punctuation to sound monotone/flat
    processedText = text
      .replace(/[\!\?]/g, ".")
      .replace(/[\,\;\:]/g, " ");
  }

  const utterance = new SpeechSynthesisUtterance(processedText);
  const voices = window.speechSynthesis.getVoices();

  // Filter English voices
  const englishVoices = voices.filter((v) => v.lang.startsWith("en"));

  const vn = voiceName ? voiceName.toLowerCase() : "";
  const isFemale = ["emily", "rachel", "bella", "sarah", "nicole", "freya", "sophie", "clara", "lily", "grace"].some(
    (n) => vn.includes(n)
  );
  // george, nicole, arthur, daniel are targeted for UK/Hazel/Daniel accents if available
  const isUK = ["nicole", "george", "arthur", "daniel"].some((n) => vn.includes(n));

  let selectedVoice = null;
  if (isFemale) {
    if (isUK) {
      // Hazel is standard UK English female
      selectedVoice = englishVoices.find(
        (v) =>
          v.name.toLowerCase().includes("hazel") ||
          (v.name.toLowerCase().includes("uk") && v.name.toLowerCase().includes("female")) ||
          (v.name.toLowerCase().includes("gb") && v.name.toLowerCase().includes("female"))
      );
    }
    if (!selectedVoice) {
      selectedVoice = englishVoices.find(
        (v) =>
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("samantha") ||
          v.name.toLowerCase().includes("google us english") ||
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("susan")
      );
    }
  } else {
    if (isUK) {
      // Daniel is standard UK English male
      selectedVoice = englishVoices.find(
        (v) =>
          v.name.toLowerCase().includes("daniel") ||
          (v.name.toLowerCase().includes("uk") && v.name.toLowerCase().includes("male")) ||
          (v.name.toLowerCase().includes("gb") && v.name.toLowerCase().includes("male"))
      );
    }
    if (!selectedVoice) {
      selectedVoice = englishVoices.find(
        (v) =>
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("mark") ||
          v.name.toLowerCase().includes("google uk english male") ||
          v.name.toLowerCase().includes("male")
      );
    }
  }

  // Fallback if no specific gender/accent voice was found
  if (!selectedVoice && englishVoices.length > 0) {
    selectedVoice = englishVoices[0];
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  // Configure unique default pitch and speed rates for all 20 system voices
  let pitch = 1.0;
  let rate = 1.0;

  if (voiceName) {
    // Female voices
    if (vn.includes("emily")) {
      pitch = 1.05;
      rate = 1.02;
    } else if (vn.includes("rachel")) {
      pitch = 1.15;
      rate = 1.12;
    } else if (vn.includes("bella")) {
      pitch = 0.95;
      rate = 0.82;
    } else if (vn.includes("sarah")) {
      pitch = 1.02;
      rate = 1.05;
    } else if (vn.includes("nicole")) {
      pitch = 0.98;
      rate = 0.96;
    } else if (vn.includes("freya")) {
      pitch = 1.10;
      rate = 0.88;
    } else if (vn.includes("sophie")) {
      pitch = 1.25;
      rate = 1.08;
    } else if (vn.includes("clara")) {
      pitch = 1.08;
      rate = 0.96;
    } else if (vn.includes("lily")) {
      pitch = 1.45; // Child
      rate = 1.05;
    } else if (vn.includes("grace")) {
      pitch = 0.92;
      rate = 0.85;
    }
    // Male voices
    else if (vn.includes("adam")) {
      pitch = 0.92;
      rate = 0.96;
    } else if (vn.includes("dom")) {
      pitch = 1.05;
      rate = 1.18;
    } else if (vn.includes("antoni")) {
      pitch = 1.00;
      rate = 0.98;
    } else if (vn.includes("michael")) {
      pitch = 0.88;
      rate = 0.92;
    } else if (vn.includes("george")) {
      pitch = 0.72; // Elderly man
      rate = 0.82;
    } else if (vn.includes("marcus")) {
      pitch = 0.80;
      rate = 0.90;
    } else if (vn.includes("daniel")) {
      pitch = 1.04;
      rate = 1.00;
    } else if (vn.includes("james")) {
      pitch = 1.10;
      rate = 1.15;
    } else if (vn.includes("arthur")) {
      pitch = 0.74; // Elderly man
      rate = 0.84;
    } else if (vn.includes("liam")) {
      pitch = 1.02;
      rate = 1.08;
    }
  }

  // Exaggeration adjustments
  // We double the exaggeration scale multiplier to make emotional changes more pronounced
  pitch = pitch + (exaggeration - 0.5) * 0.75;
  rate = rate + (exaggeration - 0.5) * 0.55;

  utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));
  utterance.rate = Math.max(0.5, Math.min(2.0, rate));
  // Volume increases with expression, lowers for flat monotone
  utterance.volume = exaggeration > 0.8 ? 1.0 : (exaggeration < 0.2 ? 0.75 : 0.9);

  if (onEnd) utterance.onend = onEnd;
  if (onError) utterance.onerror = onError;

  window.speechSynthesis.speak(utterance);
}

export function WaveformPlayer({
  src,
  text,
  voiceName,
  exaggeration = 0.5,
}: {
  src: string;
  text?: string;
  voiceName?: string;
  exaggeration?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    setIsReady(false);
    setIsPlaying(false);
    window.speechSynthesis.cancel();

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#cbd5e1", // light slate-300
      progressColor: "#7c3aed", // violet-600
      cursorColor: "#a78bfa", // violet-400
      barWidth: 2,
      barGap: 3,
      barRadius: 2,
      height: 48,
      normalize: true,
      url: src,
    });

    wavesurferRef.current = ws;

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));
    ws.on("audioprocess", (time) => setCurrentTime(time));

    ws.on("ready", (dur) => {
      setDuration(dur);
      setCurrentTime(0);
      setIsReady(true);

      // If it is demo fallback, trigger local TTS read aloud
      if (src.includes("demo-fallback-key") && text) {
        speakFallbackText(
          text,
          voiceName,
          exaggeration,
          () => {
            setIsPlaying(false);
            ws.pause();
            ws.setTime(0);
          },
          () => {
            setIsPlaying(false);
            ws.pause();
          }
        );
        ws.setMuted(true);
        ws.play().catch(() => {});
        setIsPlaying(true);
      } else {
        ws.play().catch((err) => {
          console.warn("Playback blocked by browser autoplay policy:", err);
        });
      }
    });

    return () => {
      window.speechSynthesis.cancel();
      ws.destroy();
    };
  }, [src, text, voiceName, exaggeration]);

  const togglePlay = () => {
    if (src.includes("demo-fallback-key") && text) {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        if (wavesurferRef.current) {
          wavesurferRef.current.pause();
        }
        setIsPlaying(false);
      } else {
        speakFallbackText(
          text,
          voiceName,
          exaggeration,
          () => {
            setIsPlaying(false);
            if (wavesurferRef.current) {
              wavesurferRef.current.pause();
              wavesurferRef.current.setTime(0);
            }
          },
          () => {
            setIsPlaying(false);
            if (wavesurferRef.current) {
              wavesurferRef.current.pause();
            }
          }
        );

        if (wavesurferRef.current) {
          wavesurferRef.current.setMuted(true);
          wavesurferRef.current.play().catch(() => {});
        }
        setIsPlaying(true);
      }
    } else if (wavesurferRef.current && isReady) {
      wavesurferRef.current.playPause();
    }
  };

  const toggleMute = () => {
    if (wavesurferRef.current) {
      const nextMuted = !isMuted;
      wavesurferRef.current.setMuted(nextMuted);
      setIsMuted(nextMuted);
    }
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col space-y-3 w-full shadow-xs hover:shadow-sm transition-shadow relative overflow-hidden">
      {/* Soundwave active visualizer */}
      {isPlaying && (
        <div className="absolute right-4 top-2 flex items-end gap-0.5 h-3.5 w-6 select-none opacity-85 z-20">
          <span className="w-0.75 bg-violet-600 rounded-xs h-full origin-bottom animate-wave-1" />
          <span className="w-0.75 bg-fuchsia-600 rounded-xs h-full origin-bottom animate-wave-2" />
          <span className="w-0.75 bg-indigo-650 rounded-xs h-full origin-bottom animate-wave-3" />
          <span className="w-0.75 bg-violet-600 rounded-xs h-full origin-bottom animate-wave-4" />
        </div>
      )}

      {!isReady && (
        <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex items-center justify-center gap-2 z-10">
          <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
          <span className="text-xs font-semibold text-zinc-500">Loading audio track...</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button
          onClick={togglePlay}
          disabled={!isReady}
          size="icon"
          className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shrink-0 shadow-md shadow-violet-500/10 hover:shadow-lg active:scale-95 transition-all duration-300 cursor-pointer"
        >
          {isPlaying ? (
            <Pause className="h-4.5 w-4.5 fill-current" />
          ) : (
            <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
          )}
        </Button>

        <div ref={containerRef} className="flex-1 min-w-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            onClick={toggleMute}
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 h-9 w-9 transition-colors duration-200"
          >
            {isMuted ? (
              <VolumeX className="h-4.5 w-4.5" />
            ) : (
              <Volume2 className="h-4.5 w-4.5" />
            )}
          </Button>

          <a href={src} download="voicey-generation.wav">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 h-9 w-9 transition-colors duration-200"
            >
              <Download className="h-4.5 w-4.5" />
            </Button>
          </a>
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-zinc-500 font-bold tracking-wider px-1">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
