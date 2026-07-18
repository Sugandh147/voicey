export async function generateSpeechFromModal(
  text: string,
  voiceSampleUrl?: string | null,
  voiceSampleBase64?: string | null,
  exaggeration: number = 0.5,
  emotion: string = "cheerful",
  tone: string = "podcast"
): Promise<Buffer> {
  const modalUrl = process.env.MODAL_GENERATION_URL;
  if (!modalUrl) {
    throw new Error("MODAL_GENERATION_URL environment variable is not defined");
  }

  // Send request to Modal endpoint
  const response = await fetch(modalUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Optional security header if you want to protect your Modal endpoint
      "Authorization": `Bearer ${process.env.MODAL_TOKEN_SECRET || ""}`,
    },
    body: JSON.stringify({
      text,
      audio_url: voiceSampleUrl || null,
      audio_base64: voiceSampleBase64 || null,
      exaggeration,
      emotion,
      tone,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Modal speech generation failed: ${response.statusText}. Details: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
