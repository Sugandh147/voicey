# 🎙️ Voicey - Multilingual Voice Synthesis & Translation Workstation

Voicey is a premium, feature-rich Next.js web application designed for **zero-shot Text-to-Speech (TTS)**, **multilingual speech-to-speech translation**, and **voice cloning** with a local-first architecture. 

It is preconfigured with a local **SQLite database** and **mock Clerk authentication** so you can run, develop, and test the entire workstation completely offline out-of-the-box.

---

## ✨ Key Features

### 🎙️ 1. Zero-Shot Text-to-Speech & Voice Library
- **Accent-Matching TTS**: Synthesize spoken audio clips using preloaded system voice models or custom zero-shot cloned voices.
- **Wider Voice Tone Cadences**: Choose from distinct voice styles:
  - 🎙️ **Podcast**: High-energy, conversational, and fast-paced.
  - 🎬 **Cinematic**: Booming, dramatic, and slow-paced.
  - 📽️ **Documentary**: Objective, structured, and formal narrative pacing.
  - 💬 **Conversational**: Normal spoken rate and pitch.

### 🪄 2. Tone-Based Paragraph Auto-Rewriter
- **Auto-Rewrite**: Toggle automatic rewriting to instantly restructure your text and substitute synonyms according to the selected tone.
- **Manual Rewrite**: Refine text style at any time using the inline rewrite wand (`Rewrite to style`).

### 🌐 3. Multilingual Speech-to-Speech Translator
- **Microphone Recognition**: Record user speech directly from the browser using the Web Speech API.
- **Dynamic Accent Translation**: Automatically translates between dozens of target languages and plays the translations with matching accents.

### 🎚️ 4. Togglable Waveform Player
- Powered by `wavesurfer.js` with responsive light/dark theme wave coloring.
- **Collapse/Expand**: Click the toggle button to collapse the waveform timeline into a minimal player row showing a clean timing readout (`Waveform hidden • 0:03 / 0:03`), conserving page real-estate.

### 📥 5. Direct MP3 Forced Downloads
- Custom audio router appends forced `Content-Disposition` headers so clicking download icons saves files directly to the device rather than playing in new tabs.

---

## 🛠️ Tech Stack & Setup

- **Core**: Next.js 16 (App Router & Turbopack), React 19, TypeScript
- **Database**: SQLite with Prisma Client
- **Authentication**: Clerk (Mock fallback enabled by default for zero-config local run)
- **Audio Rendering**: Wavesurfer.js

### Quick Start:

1. **Install packages**:
   ```bash
   npm install
   ```

2. **Database Push**:
   Initialize and migrate the local SQLite file (`dev.db`) and seed default system voices:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to access the workspace.

---

## 📁 Repository Layout

- `src/app/(dashboard)/text-to-speech/page.tsx` — Main configuration, auto-rewriter, and generation UI.
- `src/app/(dashboard)/speech-translation/page.tsx` — Speech-to-speech translator and player.
- `src/components/WaveformPlayer.tsx` — Custom visual wave player with collapse capabilities.
- `src/lib/rewriter.ts` — Semantic paragraph-rewriter rule mappings.
- `src/app/api/audio/[...key]/route.ts` — Custom audio streaming & forced attachment download server proxy.
- `prisma/schema.prisma` — Schema definitions for `User`, `Voice`, `Generation`, and `Translation`.
