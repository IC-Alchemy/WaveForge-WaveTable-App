import { FRAME_SIZE } from '../types';

// --- WAVEFORM GENERATORS ---

export const generateSine = (): Float32Array => {
  const buffer = new Float32Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i++) {
    buffer[i] = Math.sin((i / FRAME_SIZE) * Math.PI * 2);
  }
  return buffer;
};

export const generateSaw = (): Float32Array => {
  const buffer = new Float32Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i++) {
    buffer[i] = 1 - (2 * i) / FRAME_SIZE;
  }
  return buffer;
};

export const generateFromFormula = (formula: string): Float32Array => {
  const buffer = new Float32Array(FRAME_SIZE);
  try {
    // Create a safe-ish function execution environment
    // t goes from 0 to 1, x goes from 0 to 2PI, i is index
    const func = new Function('x', 't', 'i', 'n', `return ${formula}`);
    
    for (let i = 0; i < FRAME_SIZE; i++) {
      const t = i / FRAME_SIZE;
      const x = t * Math.PI * 2;
      let val = func(x, t, i, FRAME_SIZE);
      
      // Hard clip to prevent massive numbers
      if (isNaN(val)) val = 0;
      if (val > 1) val = 1;
      if (val < -1) val = -1;
      
      buffer[i] = val;
    }
  } catch (e) {
    console.error("Formula error", e);
    return generateSine(); // Fallback
  }
  return buffer;
};

export const generateFromHarmonics = (harmonics: number[]): Float32Array => {
  const buffer = new Float32Array(FRAME_SIZE);
  buffer.fill(0);
  
  // Additive synthesis
  for (let h = 0; h < harmonics.length; h++) {
    const amp = harmonics[h];
    if (amp === 0) continue;
    const harmonicNum = h + 1;
    
    for (let i = 0; i < FRAME_SIZE; i++) {
      buffer[i] += amp * Math.sin((i / FRAME_SIZE) * Math.PI * 2 * harmonicNum);
    }
  }
  
  return normalizeBuffer(buffer);
};

export const normalizeBuffer = (buffer: Float32Array): Float32Array => {
  let maxAmp = 0;
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  
  if (maxAmp > 0.0001) {
    const scaler = 1.0 / maxAmp;
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] *= scaler;
    }
  }
  return buffer;
};

export const interpolateFrames = (frameA: Float32Array, frameB: Float32Array, mix: number): Float32Array => {
  const result = new Float32Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i++) {
    result[i] = frameA[i] * (1 - mix) + frameB[i] * mix;
  }
  return result;
};

// --- WAV EXPORT ---

export const exportWavetableToWav = (frames: Float32Array[]): Blob => {
  const numFrames = frames.length;
  const numChannels = 1;
  const sampleRate = 44100;
  const bitsPerSample = 32; // IEEE Float
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numFrames * FRAME_SIZE * numChannels * 4; // 4 bytes per float
  
  // Total file size = header (44 bytes) + dataSize
  // Note: We are skipping the specific 'clm ' chunk logic for brevity, 
  // but keeping the standard IEEE Float format which Serum reads fine.
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // RIFF Chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeString(view, 8, 'WAVE');
  
  // fmt Chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 3, true); // AudioFormat (3 = IEEE Float)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data Chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write samples
  let offset = 44;
  frames.forEach(frame => {
    for (let i = 0; i < FRAME_SIZE; i++) {
      view.setFloat32(offset, frame[i], true);
      offset += 4;
    }
  });
  
  return new Blob([buffer], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};
