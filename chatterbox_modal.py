import modal
import tempfile
import urllib.request
import io

app = modal.App("chatterbox-tts")

# Setup model container image with necessary python packages
model_image = modal.Image.debian_slim().pip_install(
    "chatterbox-tts", 
    "torchaudio", 
    "requests",
    "fastapi"
)

@app.function(gpu="A10G", image=model_image, timeout=300)
def generate_speech_gpu(text: str, audio_prompt_url: str = None, exaggeration: float = 0.5) -> bytes:
    import torchaudio
    from chatterbox.tts import ChatterboxTTS

    # Load the Chatterbox model on GPU
    model = ChatterboxTTS.from_pretrained(device="cuda")
    
    audio_prompt_path = None
    if audio_prompt_url:
        # Download the voice sample to a temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        req = urllib.request.Request(
            audio_prompt_url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as response:
            with open(temp_file.name, 'wb') as f:
                f.write(response.read())
        audio_prompt_path = temp_file.name
        print(f"Downloaded audio prompt to {audio_prompt_path}")

    # Generate speech
    wav = model.generate(text, audio_prompt_path=audio_prompt_path, exaggeration=exaggeration)
    
    # Save waveform as WAV into bytes buffer
    buf = io.BytesIO()
    torchaudio.save(buf, wav, model.sr, format="wav")
    return buf.getvalue()

@app.function(image=model_image)
@modal.web_endpoint(method="POST")
def generate_speech_web(data: dict):
    """
    Exposes speech generation as a REST web endpoint.
    Expects JSON request: { "text": "...", "audio_url": "...", "exaggeration": 0.5 }
    """
    text = data.get("text", "")
    audio_url = data.get("audio_url", None)
    exaggeration = float(data.get("exaggeration", 0.5))

    if not text:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Missing required field: text")

    # Delegate computation to the GPU function
    audio_bytes = generate_speech_gpu.remote(
        text=text, 
        audio_prompt_url=audio_url, 
        exaggeration=exaggeration
    )

    from fastapi.responses import Response
    return Response(content=audio_bytes, media_type="audio/wav")
