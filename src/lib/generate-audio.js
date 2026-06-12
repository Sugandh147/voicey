const fs = require('fs');
const path = require('path');

function generateBeepWav() {
  const sampleRate = 8000;
  const duration = 2.0; // 2 seconds
  const numSamples = sampleRate * duration;
  const wavHeader = Buffer.alloc(44);

  // RIFF header
  wavHeader.write("RIFF", 0);
  wavHeader.writeInt32LE(36 + numSamples, 4);
  wavHeader.write("WAVE", 8);

  // fmt subchunk
  wavHeader.write("fmt ", 12);
  wavHeader.writeInt32LE(16, 16); // Subchunk1Size
  wavHeader.writeInt16LE(1, 20); // AudioFormat (1 = PCM)
  wavHeader.writeInt16LE(1, 22); // NumChannels (1 = Mono)
  wavHeader.writeInt32LE(sampleRate, 24); // SampleRate
  wavHeader.writeInt32LE(sampleRate, 28); // ByteRate
  wavHeader.writeInt16LE(1, 32); // BlockAlign
  wavHeader.writeInt16LE(8, 34); // BitsPerSample

  // data subchunk
  wavHeader.write("data", 36);
  wavHeader.writeInt32LE(numSamples, 40);

  const pcmData = Buffer.alloc(numSamples);
  const frequency = 440; // 440Hz A tone

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sampleVal = Math.round(128 + 60 * Math.sin(2 * Math.PI * frequency * t));
    pcmData.writeUInt8(sampleVal, i);
  }

  const fileData = Buffer.concat([wavHeader, pcmData]);
  const publicDir = path.join(__dirname, '..', '..', 'public');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const destPath = path.join(publicDir, "fallback.wav");
  fs.writeFileSync(destPath, fileData);
  console.log("Successfully generated offline fallback WAV at:", destPath);
}

generateBeepWav();
