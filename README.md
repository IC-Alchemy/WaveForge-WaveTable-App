# WaveForge - Wavetable Synthesizer Builder

WaveForge is a professional-grade wavetable architect designed for sound designers and electronic musicians. It allows you to create, edit, and export custom wavetables for use in popular synthesizers like Serum, Vital, and others.

<div align="center">
<img width="1200" height="475" alt="WaveForge Interface" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## Features

- **Multi-Mode Generation**:
  - **Draw**: Freehand waveform drawing with automatic smoothing.
  - **Harmonic**: Additive synthesis editor for precise partial control.
  - **Math**: Generate waveforms using JavaScript mathematical formulas.
  - **Image**: Convert images into wavetables based on luminance.
- **Advanced Editing**:
  - Real-time Waveform Canvas.
  - 3D Spectral View for visualizing wavetable progression.
  - Frame interpolation and morphing.
- **Playback & Preview**:
  - Instant audio preview of the current frame.
  - Wavetable scanning playback to hear the motion.
- **Export**:
  - Export your creations as standard .WAV files compatible with most wavetable synths.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Audio**: Web Audio API
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)

### Installation

1. Clone the repository (if you haven't already).

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the URL shown in your terminal (usually `http://localhost:5173`).

## Usage

1. **Select a Mode**: Choose between Draw, Harmonic, Math, or Image modes from the right-hand panel.
2. **Edit Frames**: Use the timeline at the bottom to add, duplicate, or delete frames.
3. **Morph**: Use the "Morph All" feature to create smooth transitions between keyframes.
4. **Export**: Click "Export .WAV" to download your wavetable.

## License

MIT
