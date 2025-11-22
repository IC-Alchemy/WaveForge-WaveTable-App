import React, { useEffect, useRef, useState } from 'react';
import { FRAME_SIZE } from '../types';

interface Wavetable3DProps {
  frames: Float32Array[];
  currentIndex: number;
  onSelectFrame: (index: number) => void;
}

const ABSURD_TITLES = [
  "AUDIO LASAGNA", "MATH JAIL", "WAVEFORM PRISON", "SPECTRAL SOUP", 
  "NON-EUCLIDEAN BAGEL", "HARMONIC DISTRESS", "FOURIER'S NIGHTMARE",
  "OSCILLATING HAMSTER", "DIGITAL ECTOPLASM", "VOID SCREAMER 3000",
  "PLEASE HELP I AM TRAPPED IN A WAVETABLE"
];

const CONSOLE_WHISPERS = [
  "The waveform is watching you.",
  "Calculating the meaning of life... result: NaN.",
  "Did you hear that?",
  "Refactoring reality...",
  "Injecting chaos into the audio buffer...",
  "Why are we here? Just to oscillate?"
];

const Wavetable3D: React.FC<Wavetable3DProps> = ({ frames, currentIndex, onSelectFrame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [title, setTitle] = useState("3D VISUALIZER");
  const [sentience, setSentience] = useState(0);
  const [sentienceLabel, setSentienceLabel] = useState("Sentience");

  // Humor Effects
  useEffect(() => {
    // Random title changes
    const titleInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        const randomTitle = ABSURD_TITLES[Math.floor(Math.random() * ABSURD_TITLES.length)];
        setTitle(randomTitle);
      } else {
        setTitle("3D VISUALIZER");
      }
    }, 3000);

    // Sentience Meter
    const sentienceInterval = setInterval(() => {
      setSentience(prev => {
        const drift = (Math.random() - 0.5) * 10;
        return Math.max(0, Math.min(100, prev + drift));
      });
      
      if (Math.random() > 0.9) {
        const labels = ["Sentience", "Angst", "Entropy", "Hunger", "Existential Dread", "Vibes"];
        setSentienceLabel(labels[Math.floor(Math.random() * labels.length)]);
      }
    }, 500);

    // Console Whispers
    const whisperInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        console.log(`%c[SYSTEM]: ${CONSOLE_WHISPERS[Math.floor(Math.random() * CONSOLE_WHISPERS.length)]}`, "color: #00ff00; background: #000; padding: 4px;");
      }
    }, 5000);

    return () => {
      clearInterval(titleInterval);
      clearInterval(sentienceInterval);
      clearInterval(whisperInterval);
    };
  }, []);

  // Drawing Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    const numFrames = frames.length;
    const perspectiveStrength = 0.25;
    
    // Draw from back to front
    for (let f = numFrames - 1; f >= 0; f--) {
      const isCurrent = f === currentIndex;
      const frameProgress = f / numFrames; // 0 (front) to 1 (back)
      
      // Perspective calculations
      const scale = 1 - (frameProgress * perspectiveStrength);
      const yOffset = height * 0.15 + (frameProgress * height * 0.7);
      const xMargin = (width * (1 - scale)) / 2;
      const frameWidth = width * scale;

      ctx.beginPath();
      const data = frames[f];
      
      const step = 8; 
      
      for (let i = 0; i < FRAME_SIZE; i += step) {
        const x = xMargin + (i / FRAME_SIZE) * frameWidth;
        const amp = data[i];
        const y = yOffset - (amp * 35 * scale); 
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Gradient Stroke
      const gradient = ctx.createLinearGradient(xMargin, 0, xMargin + frameWidth, 0);
      if (isCurrent) {
          gradient.addColorStop(0, '#22d3ee'); // Cyan
          gradient.addColorStop(1, '#a855f7'); // Purple
          ctx.shadowBlur = 15;
          ctx.shadowColor = "rgba(34, 211, 238, 0.5)";
      } else {
          const opacity = 0.1 + (1 - frameProgress) * 0.4;
          gradient.addColorStop(0, `rgba(34, 211, 238, ${opacity})`);
          gradient.addColorStop(1, `rgba(168, 85, 247, ${opacity})`);
          ctx.shadowBlur = 0;
      }

      ctx.strokeStyle = gradient;
      ctx.lineWidth = isCurrent ? 2.5 : 1;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow
      
      // Fill under the line to hide lines behind it
      ctx.lineTo(xMargin + frameWidth, yOffset + 20); // go down
      ctx.lineTo(xMargin, yOffset + 20); // go left
      ctx.fillStyle = '#0f172a'; // Match bg-gray-900 (approx)
      ctx.fill();
    }
  }, [frames, currentIndex]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percent = (y - rect.height * 0.15) / (rect.height * 0.7);
    const index = Math.floor(percent * frames.length);
    const clampedIndex = Math.max(0, Math.min(frames.length - 1, index));
    onSelectFrame(clampedIndex);
  };

  return (
    <div className="relative w-full h-64 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden group shadow-inner">
      <canvas 
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
      />
      
      {/* Dynamic Title */}
      <div className="absolute top-2 right-2 text-xs font-mono pointer-events-none transition-all duration-300 text-cyan-500/50 group-hover:text-cyan-400">
        {title}
      </div>

      {/* Sentience Meter */}
      <div className="absolute bottom-2 right-2 w-32 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-mono uppercase">
              <span>{sentienceLabel}</span>
              <span>{Math.round(sentience)}%</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                style={{ width: `${sentience}%` }}
              />
          </div>
      </div>

      <div className="absolute bottom-2 left-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Click to select frame
      </div>
    </div>
  );
};

export default Wavetable3D;