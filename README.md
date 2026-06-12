# 🎙️ Voicey

A Next.js platform for text-to-speech (TTS) and voice cloning using serverless GPU inference.

---

## 🛠️ How It Works

Voicey connects a Next.js front-end with a database, storage, and serverless GPU worker.

```mermaid
graph TD
    User([User Client]) -->|1. Submit TTS Form| WebUI[Next.js Frontend]
    WebUI -->|2. Request| Backend[tRPC Server Router]
    Backend -->|3. Check Limits| DB[(PostgreSQL)]
    Backend -->|4. Get Voice Sample| R2[(Cloudflare R2)]
    Backend -->|5. Send Payload| ModalGPU[Modal serverless A10G GPU]
    ModalGPU -->|6. Generate Audio| ModalGPU
    ModalGPU -->|7. Return Audio Bytes| Backend
    Backend -->|8. Save Audio| R2
    Backend -->|9. Log Details| DB
    Backend -->|10. Send URL| WebUI
    WebUI -->|11. Playback| Wavesurfer[Wavesurfer.js Waveform]
```

---

## 📁 Code Layout

```mermaid
graph TD
    subgraph UI & Pages [src/app]
        Dashboard["(dashboard)/page.tsx"]
        TTSPage["text-to-speech/page.tsx"]
        VoicesPage["voices/page.tsx"]
    end

    subgraph API Routers [src/server/api/routers]
        tts_router["tts.ts"]
        voices_router["voices.ts"]
        billing_router["billing.ts"]
    end

    subgraph Integration Core [src/lib]
        modal_lib["modal.ts"]
        r2_lib["r2.ts"]
        polar_lib["polar.ts"]
    end

    subgraph Database Layer [prisma]
        schema["schema.prisma"]
        seed["seed.ts"]
    end

    subgraph Webhook Listeners [src/app/api]
        polar_webhook["webhooks/polar/route.ts"]
    end

    subgraph Inference Service
        chatterbox["chatterbox_modal.py"]
    end

    %% Wiring connections
    Dashboard --> tts_router
    TTSPage --> tts_router
    VoicesPage --> voices_router
    
    tts_router --> modal_lib
    tts_router --> r2_lib
    voices_router --> r2_lib
    billing_router --> polar_lib
    
    polar_webhook --> schema
    polar_webhook --> polar_lib
    
    modal_lib -.-> chatterbox
    seed --> schema
```

---

## 🔄 Voice Cloning & Billing Flowcharts

### Voice Cloning Flow
```mermaid
graph LR
    User[User Uploads Sample] -->|PUT| R2[(Cloudflare R2)]
    R2 -->|Saves Key| DB[(PostgreSQL DB)]
    DB -->|Read Key| TTS[Modal TTS Generation]
```

### Polar Subscription Flow
```mermaid
graph LR
    User[User Upgrade] -->|Redirect| Polar[Polar.sh Checkout]
    Polar -->|Webhook Event| Listener[Webhook Router]
    Listener -->|Update Plan| DB[(PostgreSQL DB)]
```

---

## 🚀 How to Run the Website

```mermaid
graph TD
    Start([Start Local Run]) --> Install["1. npm install"]
    Install --> Config["2. cp .env.example .env"]
    Config --> DB["3. npx prisma db push & seed"]
    DB --> GPU["4. modal deploy chatterbox_modal.py"]
    GPU --> Dev["5. npm run dev"]
```

### Commands:

```bash
# 1. Install packages
npm install

# 2. Setup env
cp .env.example .env

# 3. Setup database
npx prisma db push
npx prisma db seed

# 4. Deploy GPU service
modal deploy chatterbox_modal.py
# (Add the returned URL to MODAL_GENERATION_URL inside .env)

# 5. Start website
npm run dev
```
*(Open http://localhost:3000)*
