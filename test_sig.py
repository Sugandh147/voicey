import modal

app = modal.App("test-sig")
image = modal.Image.debian_slim().pip_install("chatterbox-tts")

@app.function(image=image)
def check():
    import inspect
    from chatterbox.tts import ChatterboxTTS
    return str(inspect.signature(ChatterboxTTS.generate))

@app.local_entrypoint()
def main():
    print("SIGNATURE:", check.remote())
