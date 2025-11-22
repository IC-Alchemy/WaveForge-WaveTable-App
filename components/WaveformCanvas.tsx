import React, { useRef, useEffect, useState } from 'react';
import { FRAME_SIZE } from '../types';

interface WaveformCanvasProps {
  data: Float32Array;
  onChange: (newData: Float32Array) => void;
  isActive: boolean;
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ data, onChange, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Track previous position for interpolation
  const prevPosRef = useRef<{ index: number; amp: number } | null>(null);
  // Local ref to handle rapid updates without waiting for React render cycle
  const localDataRef = useRef<Float32Array>(data);

  // Sync local data with prop
  useEffect(() => {
    localDataRef.current = data;
  }, [data]);

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform
    ctx.strokeStyle = '#22d3ee'; // cyan-400
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const buffer = localDataRef.current;
    
    for (let i = 0; i < FRAME_SIZE; i++) {
      const x = (i / FRAME_SIZE) * width;
      // Map -1..1 to height..0
      const y = ((buffer[i] * -1 + 1) / 2) * height;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Fill
    ctx.lineTo(width, height / 2);
    ctx.lineTo(0, height / 2);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.1)';
    ctx.fill();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    draw(ctx, rect.width, rect.height);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const getCursorPosition = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    
    const index = Math.floor((x / rect.width) * FRAME_SIZE);
    // Invert Y because canvas 0 is top
    const amp = -1 * (((y / rect.height) * 2) - 1);
    
    return { index, amp };
  };

  const applyBrush = (buffer: Float32Array, centerIndex: number, amp: number) => {
    const brushSize = 15; // Width of the smoothing brush
    
    for (let i = -brushSize; i <= brushSize; i++) {
        const idx = centerIndex + i;
        if (idx >= 0 && idx < FRAME_SIZE) {
            // Basic linear falloff brush
            const falloff = 1 - (Math.abs(i) / brushSize);
            // Soft mix with existing
            buffer[idx] = buffer[idx] * (1 - falloff) + amp * falloff;
        }
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isActive) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const { index, amp } = getCursorPosition(e, canvas);
    const newData = new Float32Array(localDataRef.current);
    
    applyBrush(newData, index, amp);
    
    prevPosRef.current = { index, amp };
    localDataRef.current = newData;
    onChange(newData);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const { index: currIndex, amp: currAmp } = getCursorPosition(e, canvas);
    const prev = prevPosRef.current;
    const newData = new Float32Array(localDataRef.current);
    
    if (prev) {
        const startIdx = prev.index;
        const endIdx = currIndex;
        const steps = Math.abs(endIdx - startIdx);
        const stepDir = endIdx > startIdx ? 1 : -1;

        // Interpolate between points to fill gaps from fast movement
        if (steps === 0) {
           // No horizontal movement, just update amplitude
           applyBrush(newData, currIndex, currAmp);
        } else {
           for (let i = 0; i <= steps; i++) {
               const idx = startIdx + (i * stepDir);
               const t = i / steps;
               const interpolatedAmp = prev.amp + (currAmp - prev.amp) * t;
               applyBrush(newData, idx, interpolatedAmp);
           }
        }
    } else {
        applyBrush(newData, currIndex, currAmp);
    }

    prevPosRef.current = { index: currIndex, amp: currAmp };
    localDataRef.current = newData;
    onChange(newData);
  };

  const handleEnd = () => {
    setIsDrawing(false);
    prevPosRef.current = null;
  };

  return (
    <div className={`relative w-full h-64 bg-gray-900 rounded-lg border ${isActive ? 'border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'border-gray-700'}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg cursor-crosshair touch-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      <div className="absolute top-2 right-2 text-xs text-gray-500 font-mono pointer-events-none">
        FRAME EDITOR
      </div>
    </div>
  );
};

export default WaveformCanvas;