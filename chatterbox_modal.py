import modal
import tempfile
import urllib.request
import io

app = modal.App("chatterbox-tts")

# Container image with all required packages
model_image = (
    modal.Image.debian_slim()
    .pip_install(
        "chatterbox-tts",
        "torchaudio",
        "requests",
        "fastapi[standard]",
        "pydantic",
    )
)


# ─────────────────────────────────────────────
# GPU worker: runs inside the Modal container
# ─────────────────────────────────────────────
@app.function(gpu="A10G", image=model_image, timeout=300)
def generate_speech_gpu(
    text: str,
    audio_prompt_url: str = None,
    exaggeration: float = 0.5,
) -> bytes:
    """Synthesize speech on GPU and return raw WAV bytes."""
    import torchaudio
    from chatterbox.tts import ChatterboxTTS

    model = ChatterboxTTS.from_pretrained(device="cuda")

    audio_prompt_path = None
    if audio_prompt_url:
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

    wav = model.generate(
        text,
        audio_prompt_path=audio_prompt_path,
        exaggeration=exaggeration,
    )

    buf = io.BytesIO()
    torchaudio.save(buf, wav, model.sr, format="wav")
    return buf.getvalue()


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
        exaggeration: float = 0.5

    @web_app.post("/", response_class=Response)
    async def synthesize(data: SpeechRequest):
        """
        Generate speech from text.
        Body: { "text": "...", "audio_url": "...", "exaggeration": 0.5 }
        Returns: audio/wav
        """
        if not data.text.strip():
            raise HTTPException(status_code=400, detail="'text' field is required and cannot be empty.")

        audio_bytes: bytes = generate_speech_gpu.remote(
            text=data.text,
            audio_prompt_url=data.audio_url,
            exaggeration=data.exaggeration,
        )

        return Response(content=audio_bytes, media_type="audio/wav")

    return web_app
