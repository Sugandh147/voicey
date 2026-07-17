# 🎙️ Voicey - The AI Voice Studio

Welcome to **Voicey**! Voicey is a simple, easy-to-use web application that lets you instantly generate realistic spoken audio from text. Whether you want a deep cinematic movie trailer voice, a cheerful podcast host, or even want to clone your own voice, Voicey can do it!

---

## ✨ What can you do with Voicey?

### 🗣️ 1. Generate Lifelike Speech
Simply type in a sentence, pick a character (like Emily or Adam), and Voicey will speak it out loud. You can even customize how they speak:
- **Tone:** Make them sound like they are hosting a Podcast, narrating a Documentary, or acting in a Cinematic movie.
- **Emotion:** Choose if they should sound Cheerful, Serious, Monotone, or even Whispering!

### 🪄 2. AI Text Rewriter
Not sure how to phrase your script? Just type a rough idea, click **Rewrite**, and our AI will automatically fix your grammar and rewrite your text to perfectly match the tone you selected.

### 🌐 3. Live Speech Translator
Speak into your microphone in English, and Voicey will instantly translate and speak it back to you in languages like French, Spanish, or Hindi with a matching accent!

### 🎚️ 4. Visual Audio Player
Every time you generate audio, you get a beautiful waveform player to listen to your results. You can easily collapse it if it takes up too much space on your screen, or download the MP3 file straight to your computer.

---

## 🚀 How to Start the App (For Beginners)

If you just downloaded this project and want to run it on your own computer, simply open your terminal (command prompt) in this folder and run these three steps:

**Step 1:** Install all the required files.
```bash
npm install
```

**Step 2:** Set up the initial database.
```bash
npx prisma db push
npx prisma db seed
```

**Step 3:** Start the website!
```bash
npm run dev
```

That's it! Once it says it's ready, open your web browser and go to **[http://localhost:3000](http://localhost:3000)** to start using Voicey.

---

## 🛠️ Technical Details (For Developers)
- **Framework:** Next.js 16 (React 19)
- **Database:** Local SQLite (using Prisma)
- **Authentication:** Clerk
- **Audio:** Wavesurfer.js for visual rendering
