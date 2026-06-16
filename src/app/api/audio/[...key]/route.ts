import { NextRequest } from "next/server";
import { getR2FileBuffer } from "@/lib/r2";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

function generateSilenceWav(duration: number): Buffer {
  const sampleRate = 44100;
  const numSamples = Math.round(sampleRate * duration);
  const blockAlign = 2; // 16-bit Mono is 2 bytes per sample
  const pcmSize = numSamples * blockAlign;
  const wavHeader = Buffer.alloc(44);

  // RIFF header
  wavHeader.write("RIFF", 0);
  wavHeader.writeInt32LE(36 + pcmSize, 4);
  wavHeader.write("WAVE", 8);

  // fmt subchunk
  wavHeader.write("fmt ", 12);
  wavHeader.writeInt32LE(16, 16);
  wavHeader.writeInt16LE(1, 20); // PCM
  wavHeader.writeInt16LE(1, 22); // Mono
  wavHeader.writeInt32LE(sampleRate, 24);
  wavHeader.writeInt32LE(sampleRate * blockAlign, 28); // ByteRate = SampleRate * BlockAlign
  wavHeader.writeInt16LE(blockAlign, 32); // BlockAlign = 2
  wavHeader.writeInt16LE(16, 34); // BitsPerSample = 16

  // data subchunk
  wavHeader.write("data", 36);
  wavHeader.writeInt32LE(pcmSize, 40);

  const pcmData = Buffer.alloc(pcmSize);
  // Add a tiny noise so wavesurfer renders a subtle waveform instead of a flat line
  for (let i = 0; i < pcmSize; i += 2) {
    const noise = Math.round((Math.random() - 0.5) * 100);
    pcmData.writeInt16LE(noise, i);
  }

  return Buffer.concat([wavHeader, pcmData]);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  // Check auth
  const authSession = await auth();
  const clerkUserId = authSession.userId;
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Await the route parameters
  const { key } = await params;
  const r2Key = key.join("/");

  const download = req.nextUrl.searchParams.get("download") === "true";
  const filename = r2Key.split("/").pop() || "audio.mp3";

  const getResponseHeaders = (contentType: string) => {
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }
    return headers;
  };

  try {
    if (r2Key.startsWith("demo-generations/")) {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", r2Key);
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        return new Response(new Uint8Array(fileBuffer), {
          headers: getResponseHeaders("audio/mpeg"),
        });
      }
    }

    const isDemoKey = r2Key === "demo-fallback-key" || r2Key.startsWith("demo-voice-key-");
    
    if (isDemoKey) {
      // Find the generation text/duration in DB to match
      let duration = 5.0;
      try {
        const generation = await prisma.generation.findFirst({
          where: { userId: { not: "" } }, // get latest generation as default
          orderBy: { createdAt: "desc" },
        });
        if (generation && generation.duration) {
          duration = generation.duration;
        }
      } catch (err) {
        console.warn("Could not fetch latest generation duration for demo WAV:", err);
      }

      const fileBuffer = generateSilenceWav(duration);
      return new Response(new Uint8Array(fileBuffer), {
        headers: getResponseHeaders("audio/wav"),
      });
    }

    // Basic verification:
    // If the path is a user generation/voice, ensure they own it.
    // System voices (isSystem = true) are public.
    const isVoicePath = r2Key.startsWith("voices/");
    const isGenPath = r2Key.startsWith("generations/");

    if (isVoicePath || isGenPath) {
      // Find the user ID in the database
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
      });

      if (!dbUser) {
        return new Response("User not found", { status: 404 });
      }

      // The path format is "voices/<dbUserId>/<uuid>.wav" or "generations/<dbUserId>/<uuid>.wav"
      const pathSegments = r2Key.split("/");
      const ownerId = pathSegments[1];

      // If ownerId exists and does not match the active DB user id, and it's not a system voice, block it
      if (ownerId && ownerId !== dbUser.id) {
        // Double check if it's a system voice (e.g., if there's any system voice matching this key)
        const voice = await prisma.voice.findFirst({
          where: { r2Key, isSystem: true },
        });

        if (!voice) {
          return new Response("Unauthorized file access", { status: 403 });
        }
      }
    }

    const fileBuffer = await getR2FileBuffer(r2Key);
    return new Response(new Uint8Array(fileBuffer), {
      headers: getResponseHeaders("audio/wav"),
    });
  } catch (error) {
    console.error("Audio proxy file fetch error:", error);
    return new Response("Audio file not found", { status: 404 });
  }
}
