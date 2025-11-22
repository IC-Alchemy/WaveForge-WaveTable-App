export const FRAME_SIZE = 2048;
export const MAX_FRAMES = 256;

export interface WavetableState {
  frames: Float32Array[];
  currentIndex: number;
}

export enum GeneratorMode {
  DRAW = 'DRAW',
  MATH = 'MATH',
  HARMONIC = 'HARMONIC',
  IMAGE = 'IMAGE'
}

// Simple complex number for FFT/DFT
export interface Complex {
  re: number;
  im: number;
}