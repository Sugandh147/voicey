import modal
import tempfile
import urllib.request
import io

app = modal.App("chatterbox-tts")

# Container image with all required packages
model_image = (
    modal.Image.debian_slim()
    .apt_install("build-essential", "ffmpeg")
    .pip_install(
        "chatterbox-tts",
        "torchaudio",
        "torchcodec",
        "requests",
        "fastapi[standard]",
        "pydantic",
        "librosa",
    )
)


# ─────────────────────────────────────────────
# GPU worker: runs inside the Modal container
# ─────────────────────────────────────────────
@app.function(gpu="A10G", image=model_image, timeout=300)
def generate_speech_gpu(
    text: str,
    audio_prompt_url: str = None,
    audio_prompt_base64: str = None,
    exaggeration: float = 0.5,
    emotion: str = "cheerful",
    tone: str = "podcast",
) -> bytes:
    """Synthesize speech on GPU, apply perfect emotion styling, and return raw WAV bytes."""
    import torchaudio
    import chatterbox.tts
    from chatterbox.tts import ChatterboxTTS
    import io
    import soundfile as sf
    import librosa
    import math
    import numpy as np

    # FIX for resemble-perth NoneType error in Modal/Linux
    class DummyWatermarker:
        def __init__(self, *args, **kwargs):
            pass
        def apply_watermark(self, wav, *args, **kwargs):
            return wav

    if hasattr(chatterbox.tts, "perth"):
        class DummyPerthModule:
            PerthImplicitWatermarker = DummyWatermarker
        chatterbox.tts.perth = DummyPerthModule

    model = ChatterboxTTS.from_pretrained(device="cuda")

    audio_prompt_path = None
    if audio_prompt_base64:
        import base64
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        with open(tmp.name, "wb") as f:
            f.write(base64.b64decode(audio_prompt_base64))
        audio_prompt_path = tmp.name
        print(f"Loaded audio prompt from base64 to {audio_prompt_path}")
    elif audio_prompt_url:
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        req = urllib.request.Request(
            audio_prompt_url,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(req) as resp:
            with open(tmp.name, "wb") as f:
                f.write(resp.read())
        audio_prompt_path = tmp.name
        print(f"Downloaded audio prompt to {audio_prompt_path}")
        
    # Inject style tag directly for zero-shot text condition as well
    if emotion and emotion.lower() != "neutral":
        formatted_emotion = emotion.replace("_", " ").lower()
        text = f"[{formatted_emotion.capitalize()}] {text}"

    # Generate raw audio
    wav_tensor = model.generate(
        text=text,
        audio_prompt_path=audio_prompt_path,
        exaggeration=exaggeration,
    )
    
    sample_rate = model.sr
    audio_wav = wav_tensor.squeeze().cpu().numpy()

    
    # ---------------------------------------------------------
    # Apply Perfect Emotion & Tone Audio Manipulation
    # ---------------------------------------------------------
    pitch_multiplier = 1.0
    rate_multiplier = 1.0

    selected_emotion = emotion.lower() if emotion else "cheerful"

    if selected_emotion == "cheerful":
        pitch_multiplier *= 1.20
        rate_multiplier *= 1.08
    elif selected_emotion == "serious":
        pitch_multiplier *= 0.82
        rate_multiplier *= 0.86
    elif selected_emotion == "monotone":
        pitch_multiplier = 0.90
        rate_multiplier = 0.92
    elif selected_emotion == "fully_expressive":
        pitch_multiplier *= 1.35
        rate_multiplier *= 1.15
    elif selected_emotion == "melodious":
        pitch_multiplier *= 1.10
        rate_multiplier *= 0.92
    elif selected_emotion == "whispering":
        pitch_multiplier *= 0.90
        rate_multiplier *= 0.72
    elif selected_emotion == "singing":
        pitch_multiplier *= 1.26
        rate_multiplier *= 0.96
    elif selected_emotion == "deep":
        pitch_multiplier *= 0.60
        rate_multiplier *= 0.80

    selected_tone = tone.lower() if tone else "podcast"
    if selected_tone == "cinematic":
        pitch_multiplier *= 0.72
        rate_multiplier *= 0.74
    elif selected_tone == "documentary":
        pitch_multiplier *= 0.90
        rate_multiplier *= 0.86
    elif selected_tone == "podcast":
        pitch_multiplier *= 1.10
        rate_multiplier *= 1.12
    elif selected_tone == "conversational":
        pitch_multiplier *= 0.98
        rate_multiplier *= 1.04

    exaggeration_delta = exaggeration - 0.5
    if selected_emotion == "monotone":
        rate_multiplier += exaggeration_delta * 0.4
    else:
        pitch_multiplier += exaggeration_delta * 1.50
        rate_multiplier += exaggeration_delta * 1.10

    pitch_multiplier = max(0.35, min(2.3, pitch_multiplier))
    rate_multiplier = max(0.35, min(2.3, rate_multiplier))

    # Convert audio_wav to 1D float32 numpy array for librosa
    audio_wav = np.array(audio_wav, dtype=np.float32)
    if len(audio_wav.shape) > 1:
        audio_wav = audio_wav.mean(axis=1)

    if abs(rate_multiplier - 1.0) > 0.01:
        audio_wav = librosa.effects.time_stretch(y=audio_wav, rate=rate_multiplier)

    if abs(pitch_multiplier - 1.0) > 0.01:
        n_steps = 12.0 * math.log2(pitch_multiplier)
        audio_wav = librosa.effects.pitch_shift(y=audio_wav, sr=sample_rate, n_steps=n_steps)

    out_buffer = io.BytesIO()
    sf.write(out_buffer, audio_wav, sample_rate, format="WAV")
    return out_buffer.getvalue()


# ─────────────────────────────────────────────
# Web endpoint: FastAPI ASGI app served by Modal
# All fastapi/pydantic imports live INSIDE this
# function so they only run inside the container.
# ─────────────────────────────────────────────
@app.function(image=model_image)
@modal.concurrent(max_inputs=10)
@modal.asgi_app()
def generate_speech_web():
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import Response
    from pydantic import BaseModel

    web_app = FastAPI(title="Chatterbox TTS")

    class SpeechRequest(BaseModel):
        text: str
        audio_url: str | None = None
        audio_base64: str | None = None
        exaggeration: float = 0.5
        emotion: str = "cheerful"
        tone: str = "podcast"

    @web_app.post("/", response_class=Response)
    async def synthesize(data: SpeechRequest):
        """
        Generate speech from text.
        Body: { "text": "...", "audio_url": "...", "audio_base64": "...", "exaggeration": 0.5 }
        Returns: audio/wav
        """
        if not data.text.strip():
            raise HTTPException(status_code=400, detail="'text' field is required and cannot be empty.")

        audio_bytes: bytes = generate_speech_gpu.remote(
            text=data.text,
            audio_prompt_url=data.audio_url,
            audio_prompt_base64=data.audio_base64,
            exaggeration=data.exaggeration,
            emotion=data.emotion,
            tone=data.tone,
        )

        return Response(content=audio_bytes, media_type="audio/wav")

    return web_app
