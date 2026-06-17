import { exec } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Generate speech locally.
 * If running on Windows, uses PowerShell SAPI with SSML for voice profiles, tones, emotions, and exaggeration.
 * Otherwise, falls back to Google Translate TTS chunks.
 */
export async function generateSpeechLocal(
  text: string,
  voiceName: string,
  exaggeration: number = 0.5,
  tone: string = "podcast",
  targetLang: string = "en",
  emotion: string = "cheerful"
): Promise<{ buffer: Buffer; format: "wav" | "mp3" }> {
  const isWindows = process.platform === "win32";

  if (isWindows) {
    try {
      return await generateSpeechWindows(text, voiceName, exaggeration, tone, targetLang, emotion);
    } catch (err) {
      console.error("Local Windows TTS failed, falling back to Google Translate:", err);
    }
  }

  // Fallback to Google Translate TTS
  const buffer = await generateSpeechGoogleTranslate(text, targetLang);
  return { buffer, format: "mp3" };
}

async function generateSpeechWindows(
  text: string,
  voiceName: string,
  exaggeration: number,
  tone: string,
  targetLang: string,
  emotion: string
): Promise<{ buffer: Buffer; format: "wav" }> {
  return new Promise((resolve, reject) => {
    const tempId = crypto.randomUUID();
    const tempPsFile = path.join(process.cwd(), "public", `temp-speak-${tempId}.ps1`);
    const ssmlFile = path.join(process.cwd(), "public", `ssml-${tempId}.xml`);
    const outputPath = path.join(process.cwd(), "public", `temp-output-${tempId}.wav`);

    const vn = voiceName ? voiceName.toLowerCase() : "";
    
    // Check if it is a female model
    const isFemale = ["emily", "rachel", "bella", "sarah", "nicole", "freya", "sophie", "clara", "lily", "grace"].some(
      (n) => vn.includes(n)
    );

    // Default system SAPI voices on Windows
    let systemVoiceName = isFemale ? "Microsoft Zira Desktop" : "Microsoft David Desktop";

    // Pitch and rate multipliers
    let pitchMultiplier = 1.0;
    let rateMultiplier = 1.0;
    let volumeLevel = 100; // 0 to 100

    // ==========================================
    // 1. Base Configurations for All 20 Voices
    // ==========================================
    if (vn.includes("emily")) {
      // Cheerful, high-pitched, energetic female
      pitchMultiplier = 1.22;
      rateMultiplier = 1.12;
    } else if (vn.includes("rachel")) {
      // Melodious, expressive, bright female
      pitchMultiplier = 1.12;
      rateMultiplier = 1.04;
    } else if (vn.includes("bella")) {
      // Serious, deep, slow-paced female
      pitchMultiplier = 0.84;
      rateMultiplier = 0.88;
    } else if (vn.includes("sarah")) {
      // Monotone, robotic, precise female
      pitchMultiplier = 0.98;
      rateMultiplier = 0.94;
    } else if (vn.includes("nicole")) {
      // Singing-like, high-pitched, melodic female
      pitchMultiplier = 1.32;
      rateMultiplier = 0.98;
    } else if (vn.includes("freya")) {
      // Deep, low-toned, serious, slow female
      pitchMultiplier = 0.78;
      rateMultiplier = 0.80;
    } else if (vn.includes("sophie")) {
      // Extremely cheerful, bubbly, very high-pitched female
      pitchMultiplier = 1.42;
      rateMultiplier = 1.18;
    } else if (vn.includes("clara")) {
      // Professional, calm, medium-tone female
      pitchMultiplier = 1.05;
      rateMultiplier = 0.98;
    } else if (vn.includes("lily")) {
      // Soft, whispering, slow female
      pitchMultiplier = 0.90;
      rateMultiplier = 0.74;
      volumeLevel = 70; // softer base volume
    } else if (vn.includes("grace")) {
      // Standard friendly, warm, medium-pitch female
      pitchMultiplier = 1.08;
      rateMultiplier = 1.05;
    } else if (vn.includes("adam")) {
      // Serious, deep, authoritative male
      pitchMultiplier = 0.80;
      rateMultiplier = 0.90;
    } else if (vn.includes("dom")) {
      // Cheerful, energetic, fast male
      pitchMultiplier = 1.10;
      rateMultiplier = 1.20;
    } else if (vn.includes("antoni")) {
      // Monotone, deadpan, robotic male
      pitchMultiplier = 0.95;
      rateMultiplier = 0.96;
    } else if (vn.includes("michael")) {
      // Extremely deep, movie-trailer-like male
      pitchMultiplier = 0.62;
      rateMultiplier = 0.78;
    } else if (vn.includes("george")) {
      // Old, raspy, very slow, low-pitch male
      pitchMultiplier = 0.52;
      rateMultiplier = 0.68;
    } else if (vn.includes("marcus")) {
      // Smooth, radio-host male
      pitchMultiplier = 1.00;
      rateMultiplier = 1.02;
    } else if (vn.includes("daniel")) {
      // Singing-like, rhythmic, cheerful male
      pitchMultiplier = 1.18;
      rateMultiplier = 1.10;
    } else if (vn.includes("james")) {
      // High-toned, clean, youthful male
      pitchMultiplier = 1.14;
      rateMultiplier = 1.16;
    } else if (vn.includes("arthur")) {
      // Whispering, intellectual, slow male
      pitchMultiplier = 0.86;
      rateMultiplier = 0.76;
      volumeLevel = 70;
    } else if (vn.includes("liam")) {
      // Standard friendly, energetic, modern male
      pitchMultiplier = 0.98;
      rateMultiplier = 1.08;
    } else if (vn.length > 0) {
      // Custom Voice Clone
      const hash = vn.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const useFemale = hash % 2 === 0;
      systemVoiceName = useFemale ? "Microsoft Zira Desktop" : "Microsoft David Desktop";
      
      const pitchOffset = ((hash % 9) - 4) / 12; // -0.33 to +0.33 range
      const rateOffset = (((hash * 13) % 9) - 4) / 12; // -0.33 to +0.33 range
      pitchMultiplier += pitchOffset;
      rateMultiplier += rateOffset;
    }

    // ==========================================
    // 2. Emotion Style Tags Adjustments
    // ==========================================
    const selectedEmotion = emotion ? emotion.toLowerCase() : "cheerful";
    
    if (selectedEmotion === "cheerful") {
      pitchMultiplier *= 1.20;
      rateMultiplier *= 1.08;
    } else if (selectedEmotion === "serious") {
      pitchMultiplier *= 0.82;
      rateMultiplier *= 0.86;
    } else if (selectedEmotion === "monotone") {
      pitchMultiplier = isFemale ? 0.95 : 0.85; // reset and flatten pitch
      rateMultiplier = 0.92;
    } else if (selectedEmotion === "fully_expressive") {
      pitchMultiplier *= 1.35;
      rateMultiplier *= 1.15;
    } else if (selectedEmotion === "melodious") {
      pitchMultiplier *= 1.10;
      rateMultiplier *= 0.92;
    } else if (selectedEmotion === "whispering") {
      pitchMultiplier *= 0.90;
      rateMultiplier *= 0.72;
      volumeLevel = Math.round(volumeLevel * 0.55); // quiet whispering
    } else if (selectedEmotion === "singing") {
      pitchMultiplier *= 1.26;
      rateMultiplier *= 0.96;
    } else if (selectedEmotion === "deep") {
      pitchMultiplier *= 0.60;
      rateMultiplier *= 0.80;
    }

    // ==========================================
    // 3. Tone Configurations
    // ==========================================
    if (tone === "cinematic") {
      pitchMultiplier *= 0.72;
      rateMultiplier *= 0.74;
    } else if (tone === "documentary") {
      pitchMultiplier *= 0.90;
      rateMultiplier *= 0.86;
    } else if (tone === "podcast") {
      pitchMultiplier *= 1.10;
      rateMultiplier *= 1.12;
    } else if (tone === "conversational") {
      pitchMultiplier *= 0.98;
      rateMultiplier *= 1.04;
    }

    // ==========================================
    // 4. Exaggeration Strength Mapping
    // ==========================================
    // Exaggeration controls the intensity of the pitch & rate shifts
    const exaggerationDelta = exaggeration - 0.5;
    
    if (selectedEmotion === "monotone") {
      // For monotone, higher exaggeration makes it even flatter (less dynamic range)
      // We will adjust speed slower
      rateMultiplier += exaggerationDelta * 0.4;
    } else {
      pitchMultiplier += exaggerationDelta * 1.50;
      rateMultiplier += exaggerationDelta * 1.10;
    }

    // Constrain multipliers to ensure intelligibility
    pitchMultiplier = Math.max(0.35, Math.min(2.3, pitchMultiplier));
    rateMultiplier = Math.max(0.35, Math.min(2.3, rateMultiplier));
    volumeLevel = Math.max(10, Math.min(100, volumeLevel));

    // Convert to relative percentage offsets for SSML
    const pitchPercent = Math.round((pitchMultiplier - 1.0) * 100);
    const pitchStr = pitchPercent >= 0 ? `+${pitchPercent}%` : `${pitchPercent}%`;
    const ratePercent = Math.round((rateMultiplier - 1.0) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    // ==========================================
    // 5. Punctuation Pauses & Breaks
    // ==========================================
    let processedText = text;
    if (selectedEmotion === "fully_expressive" || exaggeration > 0.8) {
      processedText = text
        .replace(/(\. )/g, ' <break time="650ms"/> ')
        .replace(/(\!)/g, ' <break time="400ms"/> ! ')
        .replace(/(\?)/g, ' <break time="500ms"/> ? ');
    } else if (selectedEmotion === "monotone" || exaggeration < 0.2) {
      // strip pauses for monotone
      processedText = text.replace(/[\!\?]/g, ".").replace(/[\,\;\:]/g, " ");
    } else if (selectedEmotion === "singing") {
      // add lyrical rhythmic breath pauses
      processedText = text.replace(/(\s+)/g, (match, p1, offset) => {
        return offset % 25 === 0 ? ' <break time="350ms"/> ' : " ";
      });
    }

    const escapedText = escapeXml(processedText);

    // Build SSML wrapper
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${systemVoiceName}'><prosody pitch='${pitchStr}' rate='${rateStr}' volume='${volumeLevel}'>${escapedText}</prosody></voice></speak>`;
    
    fs.writeFileSync(ssmlFile, ssml, "utf8");

    const psCode = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile("${outputPath}")
$ssmlText = Get-Content -Raw -Path "${ssmlFile}" -Encoding UTF8
$synth.SpeakSsml($ssmlText)
$synth.Dispose()
`;

    fs.writeFileSync(tempPsFile, psCode, "utf8");

    exec(`powershell -ExecutionPolicy Bypass -File "${tempPsFile}"`, (err, stdout, stderr) => {
      // Cleanup temp script files
      try { fs.unlinkSync(tempPsFile); } catch (e) {}
      try { fs.unlinkSync(ssmlFile); } catch (e) {}

      if (err) {
        try { fs.unlinkSync(outputPath); } catch (e) {}
        console.error("PowerShell TTS error:", err, stderr);
        return reject(err);
      }

      try {
        if (fs.existsSync(outputPath)) {
          const buffer = fs.readFileSync(outputPath);
          try { fs.unlinkSync(outputPath); } catch (e) {}
          resolve({ buffer, format: "wav" });
        } else {
          reject(new Error("Output WAV file was not generated by PowerShell."));
        }
      } catch (readErr) {
        reject(readErr);
      }
    });
  });
}

async function generateSpeechGoogleTranslate(text: string, lang: string): Promise<Buffer> {
  const maxTtsLength = 200;
  const textChunks: string[] = [];

  if (text.length <= maxTtsLength) {
    textChunks.push(text);
  } else {
    const words = text.split(/\s+/);
    let currentChunk = "";
    for (const word of words) {
      if ((currentChunk + " " + word).trim().length > maxTtsLength) {
        if (currentChunk) textChunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk = (currentChunk + " " + word).trim();
      }
    }
    if (currentChunk) {
      textChunks.push(currentChunk.trim());
    }
  }

  const audioBuffers: Buffer[] = [];
  for (const chunk of textChunks) {
    if (!chunk) continue;
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const response = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    if (!response.ok) {
      throw new Error(`Google Translate TTS returned status: ${response.status} for chunk: ${chunk}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    audioBuffers.push(Buffer.from(arrayBuffer));
  }

  return Buffer.concat(audioBuffers);
}
