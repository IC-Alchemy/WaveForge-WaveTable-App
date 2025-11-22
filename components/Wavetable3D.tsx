import React, { useEffect, useRef } from 'react';
import { FRAME_SIZE } from '../types';

interface Wavetable3DProps {
  frames: Float32Array[];
  currentIndex: number;
  onSelectFrame: (index: number) => void;
}

const Wavetable3D: React.FC<Wavetable3DProps> = ({ frames, currentIndex, onSelectFrame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const perspectiveStrength = 0.2;
    
    // Draw from back to front
    for (let f = numFrames - 1; f >= 0; f--) {
      const isCurrent = f === currentIndex;
      const frameProgress = f / numFrames; // 0 (front) to 1 (back)
      
      // Perspective calculations
      // As frameProgress goes up (back), y moves up, x shrinks
      const scale = 1 - (frameProgress * perspectiveStrength);
      const yOffset = height * 0.1 + (frameProgress * height * 0.8);
      const xMargin = (width * (1 - scale)) / 2;
      const frameWidth = width * scale;

      ctx.beginPath();
      const data = frames[f];
      
      // Resolution reduction for performance on the small 3D view
      const step = 8; 
      
      for (let i = 0; i < FRAME_SIZE; i += step) {
        const x = xMargin + (i / FRAME_SIZE) * frameWidth;
        // Amplitude affects Y, scaled by perspective
        const amp = data[i];
        const y = yOffset - (amp * 30 * scale); // 30px max height
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = isCurrent ? '#22d3ee' : `rgba(100, 116, 139, ${0.2 + (1-frameProgress)*0.5})`;
      ctx.lineWidth = isCurrent ? 2 : 1;
      ctx.stroke();
      
      // Fill under the line to hide lines behind it
      ctx.lineTo(xMargin + frameWidth, yOffset + 10); // go down
      ctx.lineTo(xMargin, yOffset + 10); // go left
      ctx.fillStyle = '#0d1117'; // Background color to mask
      ctx.fill();
    }
  }, [frames, currentIndex]);

  const handleClick = (e: React.MouseEvent) => {
    // Approximate click to frame
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Invert the y calculation to find approx frame
    // y ~= height * 0.1 + (frameProgress * height * 0.8)
    // frameProgress ~= (y - height*0.1) / (height*0.8)
    
    const percent = (y - rect.height * 0.1) / (rect.height * 0.8);
    const index = Math.floor(percent * frames.length);
    const clampedIndex = Math.max(0, Math.min(frames.length - 1, index));
    
    onSelectFrame(clampedIndex);
  };

  return (
    <div className="relative w-full h-64 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden group">
      <canvas 
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
      />
      <div className="absolute top-2 right-2 text-xs text-gray-500 font-mono pointer-events-none">
        3D VISUALIZER
      </div>
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Click to select frame
      </div>
    </div>
  );
};

export default Wavetable3D;