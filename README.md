# 🎙️ Voicey - Multilingual Voice Synthesis & Translation Workstation

Voicey is a premium, feature-rich Next.js web application designed for **multilingual speech-to-speech translation**, **zero-shot Text-to-Speech (TTS)**, and **voice cloning** using serverless GPU inference. 

Whether running with full GPU infrastructure or in local **Demo Mode**, Voicey delivers playable, downloadable audio clips in any language, supported by modern theme dynamics.

---

## ✨ Key Features

### 🌐 1. Multilingual Speech-to-Speech Translator Console
- **Real-Time Microphone Recognition**: Record user speech directly from the browser using the Web Speech API (`webkitSpeechRecognition`).
- **Dynamic Accent-Matched Playback**: Automatically matches the voice synthesis engine with native accents (e.g., Japanese, Hindi, French, Spanish) for translations.
- **Saved History Logs**: Translate text, review it on responsive visual cards, listen to spoken audio clips, and save transactions to your database history.

### 🎙️ 2. Custom & Library Voice Synthesis
- **Accent-Matching TTS Generation**: Type text in any language, translate to a target language, and synthesize audio with system library voices (like Grace) or user-uploaded cloned voices.
- **WAV & MP3 Downloadable Clips**: Unlike basic reader tools, Voicey generates complete files that can be fully downloaded, played back, and visualized.

### 🌓 3. Interactive Theme Support (Light / Dark Mode)
- Full application theme integration using `next-themes` and custom styling components.
- Auto-updating **WaveformPlayer** powered by `wavesurfer.js` that changes track and wave colors dynamically to ensure perfect visual contrast in both Light and Dark modes.

### 💾 4. Intelligent Hybrid Modes (Demo vs. Production)
- > [!NOTE]
  > **Demo Mode (Offline/Local)**: Bypasses serverless GPU calls if `CLOUDFLARE_R2_BUCKET` or `MODAL_GENERATION_URL` is missing. It retrieves Google Translate's high-fidelity audio streams, caches them locally in `public/demo-generations/`, and serves them via a custom chunk-streaming router.
- > [!TIP]
  > **Production Mode (GPU Serverless)**: Utilizes a Modal GPU instance running zero-shot speech synthesis models on an A10G GPU, saving audio output directly to Cloudflare R2 storage for cloud-scale delivery.

---

## 🛠️ System Architecture & How It Works

### Execution Paths
```mermaid
graph TD
    User([User Client]) -->|1. Submit TTS or Translate| WebUI[Next.js Frontend]
    WebUI -->|2. Query/Mutation| Backend[tRPC Server Router]
    Backend -->|3. Check Limits & Log| DB[(PostgreSQL Database)]
    
    Backend --> IsConfig{Configured?}
    
    %% Demo Mode
    IsConfig -->|No: Demo Mode| GoogleTTS[Google Translate TTS Stream]
    GoogleTTS -->|Cache File| LocalFS[(Local Directory: public/demo-generations/)]
    LocalFS -->|4a. Stream Chunk Response| ProxyRoute[Audio Proxy: /api/audio/*]
    ProxyRoute -->|Play & Download| WebUI
    
    %% Production Mode
    IsConfig -->|Yes: Production Mode| R2Voice[Get Custom Voice Sample from R2]
    R2Voice -->|Payload| ModalGPU[Modal serverless A10G GPU]
    ModalGPU -->|5a. Synthesis| ModalGPU
    ModalGPU -->|5b. Return Bytes| Backend
    Backend -->|5c. Save WAV| R2Bucket[(Cloudflare R2 Bucket)]
    R2Bucket -->|5d. Signed URL| WebUI
    
    WebUI -->|Visualize Waveform| Waveform[WaveformPlayer wavesurfer.js]
```

---

## 📁 Code Layout

```mermaid
graph TD
    subgraph UI Pages [src/app]
        Dashboard["(dashboard)/page.tsx - Dashboard Info & Overview"]
        TTSPage["text-to-speech/page.tsx - Multilingual Clip Console"]
        VoicesPage["voices/page.tsx - Voice Cloning Library"]
        TranslatorPage["speech-translation/page.tsx - Speech-to-Speech Console"]
    end

    subgraph Backend Routers [src/server/api/routers]
        tts_router["tts.ts - TTS generation logic & Google fallback"]
        voices_router["voices.ts - Custom voice clone CRUD operations"]
        billing_router["billing.ts - Polar.sh subscription handler"]
        translation_router["translation.ts - Translate text & db logs"]
    end

    subgraph Integration Layer [src/lib]
        modal_lib["modal.ts - Serverless Modal client interface"]
        r2_lib["r2.ts - Cloudflare R2 bucket connection"]
        polar_lib["polar.ts - Polar subscription API client"]
    end

    subgraph Database Schema [prisma]
        schema["schema.prisma - prisma tables & relations"]
        seed["seed.ts - Default system voice seeder"]
    end

    subgraph Endpoint Interfaces [src/app/api]
        polar_webhook["webhooks/polar/route.ts - Checkout Webhook"]
        audio_proxy["audio/[...key]/route.ts - Audio Streaming API"]
    end

    %% Wiring connections
    Dashboard --> tts_router
    TTSPage --> tts_router
    VoicesPage --> voices_router
    TranslatorPage --> translation_router
    
    tts_router --> modal_lib
    tts_router --> r2_lib
    voices_router --> r2_lib
    billing_router --> polar_lib
    
    polar_webhook --> schema
    polar_webhook --> polar_lib
    
    seed --> schema
```

---

## 🗄️ Database Schema Details

The database models defined in [schema.prisma](file:///c:/Users/ACER/voicey/prisma/schema.prisma) coordinate subscriptions, custom voice models, audio clips, and translation logs:

| Model | Purpose | Key Attributes |
| :--- | :--- | :--- |
| **`User`** | Tracks Clerk authenticated users, subscription level (`FREE` vs `PRO`), and current usage metrics. | `clerkId`, `email`, `plan`, `usageCount` |
| **`Voice`** | Custom voice models uploaded for zero-shot cloning or default system voices. | `name`, `r2Key` *(null for system voices)*, `isSystem` |
| **`Generation`** | Log of generated audio files, preserving target languages and local cache keys. | `text`, `r2Key`, `duration`, `targetLang` |
| **`Translation`** | Log of translation transactions performed on the Speech Translator page. | `sourceText`, `sourceLang`, `targetText`, `targetLang` |

---

## 🚀 How to Run the Website

### Setup Sequence:
```mermaid
graph TD
    Start([Start Local Setup]) --> Install["1. npm install"]
    Install --> Config["2. cp .env.example .env"]
    Config --> DB["3. npx prisma db push & seed"]
    DB --> GPU["4. (Optional) modal deploy chatterbox_modal.py"]
    DB --> Dev["5. npm run dev"]
```

### Setup Instructions:

1. **Install project packages**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory (refer to `.env.example`).
   ```env
   # PostgreSQL database connection
   DATABASE_URL="postgresql://username:password@localhost:5432/voicey"

   # Clerk Auth Credentials
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
   NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

   # Polar.sh Billing Credentials (Optional)
   POLAR_API_TOKEN="..."
   POLAR_WEBHOOK_SECRET="..."

   # Cloudflare R2 & Modal GPU config (Optional - Leave blank for Local Demo Mode)
   CLOUDFLARE_R2_ACCESS_KEY_ID="..."
   CLOUDFLARE_R2_SECRET_ACCESS_KEY="..."
   CLOUDFLARE_R2_ENDPOINT="..."
   CLOUDFLARE_R2_BUCKET="..."
   CLOUDFLARE_R2_PUBLIC_URL="..."
   MODAL_GENERATION_URL="..."
   ```

3. **Initialize Database**:
   Push the latest Prisma schema (including `Translation` & `targetLang`) and seed the system voices.
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

4. **Deploy Serverless GPU Inference** *(Optional)*:
   If configuring GPU capabilities, deploy the Modal script.
   ```bash
   modal deploy chatterbox_modal.py
   # Save the returned inference URL to MODAL_GENERATION_URL inside .env
   ```

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to access the workspace.
