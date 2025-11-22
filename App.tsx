import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Download, Activity, Layers, Wand2, Image as ImageIcon, Plus, Trash2, Copy } from 'lucide-react';
import WaveformCanvas from './components/WaveformCanvas';
import Wavetable3D from './components/Wavetable3D';
import HarmonicEditor from './components/HarmonicEditor';
import { 
  generateSine, 
  generateFromFormula, 
  generateFromHarmonics, 
  exportWavetableToWav,
  normalizeBuffer,
  interpolateFrames
} from './utils/audioUtils';
import { FRAME_SIZE, MAX_FRAMES, GeneratorMode } from './types';

const App: React.FC = () => {
  // State
  const [frames, setFrames] = useState<Float32Array[]>([generateSine()]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<GeneratorMode>(GeneratorMode.DRAW);
  const [formula, setFormula] = useState('Math.sin(x) * Math.cos(t * 5)');
  const [playbackSpeed, setPlaybackSpeed] = useState(200); // ms per frame when scanning
  
  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Initialize Audio
  useEffect(() => {
    const initAudio = async () => {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctx();
        
        gainNodeRef.current = audioCtxRef.current!.createGain();
        gainNodeRef.current.gain.value = 0.1;
        gainNodeRef.current.connect(audioCtxRef.current!.destination);
      }
    };
    initAudio();
    return () => {
        if (audioCtxRef.current?.state !== 'closed') {
            audioCtxRef.current?.close();
        }
    };
  }, []);

  // Update Audio when frame changes or Play state changes
  useEffect(() => {
    if (!audioCtxRef.current || !gainNodeRef.current) return;

    const updateOscillator = () => {
      if (oscillatorRef.current) {
        oscillatorRef.current.disconnect();
      }

      // Create periodic wave from current frame
      // We need to convert Time Domain -> Frequency Domain for createPeriodicWave
      // However, for a simple preview, filling an AudioBuffer and playing it in a loop 
      // is often more accurate to exactly what is drawn, especially for rough sketches.
      
      const buffer = audioCtxRef.current!.createBuffer(1, FRAME_SIZE, audioCtxRef.current!.sampleRate);
      // Resample our 2048 frame to whatever the sample rate pitch requires? 
      // Actually, to hear the wavetable "character", we usually play it at a fixed low-ish note (e.g. F1 or C2).
      // At 44.1kHz, 2048 samples is ~21Hz. If we just loop it, it sounds like 21Hz.
      // To play a specific pitch, we should use createPeriodicWave (requires FFT) or a looping buffer with playbackRate.
      
      const channelData = buffer.getChannelData(0);
      // Copy current frame data
      channelData.set(frames[currentIndex]);

      const source = audioCtxRef.current!.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      
      // Pitch correction:
      // 2048 samples at 44100Hz = 21.53Hz.
      // If we want to hear Middle C (261.6Hz), we need to speed it up.
      // Rate = DesiredFreq / (SampleRate / FrameSize)
      // Rate = 261.6 / (44100 / 2048) ~= 12.15
      // Let's play a nice bass note, e.g., C2 (65.41Hz)
      const baseFreq = audioCtxRef.current!.sampleRate / FRAME_SIZE;
      const targetFreq = 65.41; 
      source.playbackRate.value = targetFreq / baseFreq;

      source.connect(gainNodeRef.current!);
      source.start();
      oscillatorRef.current = source as any; // Storing BufferSource in the Ref typed as Oscillator (lazy hack, but functional for preview)
    };

    if (isPlaying) {
      updateOscillator();
    } else {
      if (oscillatorRef.current) {
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
    }
  }, [isPlaying, currentIndex, frames]);

  // Transport Handlers
  const togglePlay = async () => {
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    setIsPlaying(!isPlaying);
  };

  const handleScanPlayback = () => {
     if (scanIntervalRef.current) {
         clearInterval(scanIntervalRef.current);
         scanIntervalRef.current = null;
         return;
     }
     
     // Simple auto-scanner
     setIsPlaying(true);
     scanIntervalRef.current = window.setInterval(() => {
         setCurrentIndex(prev => (prev + 1) % frames.length);
     }, playbackSpeed);
  };
  
  useEffect(() => {
      // Cleanup scan on unmount or if playback stops manually
      if (!isPlaying && scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
      }
  }, [isPlaying]);

  // Data Manipulation
  const handleWaveformChange = useCallback((newData: Float32Array) => {
    setFrames(prev => {
      const next = [...prev];
      next[currentIndex] = newData;
      return next;
    });
  }, [currentIndex]);

  const addFrame = () => {
    if (frames.length >= MAX_FRAMES) return;
    setFrames([...frames, new Float32Array(frames[currentIndex])]);
    setCurrentIndex(frames.length);
  };
  
  const deleteFrame = () => {
      if (frames.length <= 1) return;
      const newFrames = frames.filter((_, i) => i !== currentIndex);
      setFrames(newFrames);
      setCurrentIndex(Math.min(currentIndex, newFrames.length - 1));
  };

  const handleFormulaGenerate = () => {
      const newData = generateFromFormula(formula);
      handleWaveformChange(newData);
  };

  const handleHarmonicChange = (harmonics: number[]) => {
      if (mode === GeneratorMode.HARMONIC) {
          const newData = generateFromHarmonics(harmonics);
          handleWaveformChange(newData);
      }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
              // Create a temp canvas to read pixels
              const cvs = document.createElement('canvas');
              cvs.width = FRAME_SIZE;
              cvs.height = 1; // Collapse to 1 line for simple brightness mapping
              const ctx = cvs.getContext('2d');
              if (!ctx) return;
              
              ctx.drawImage(img, 0, 0, FRAME_SIZE, 1);
              const imgData = ctx.getImageData(0, 0, FRAME_SIZE, 1);
              const px = imgData.data;
              
              const newWave = new Float32Array(FRAME_SIZE);
              for(let i=0; i<FRAME_SIZE; i++) {
                  // Grayscale average
                  const r = px[i*4];
                  const g = px[i*4+1];
                  const b = px[i*4+2];
                  const brightness = (r+g+b) / 3;
                  // Map 0..255 to -1..1
                  newWave[i] = (brightness / 127.5) - 1;
              }
              handleWaveformChange(normalizeBuffer(newWave));
          };
          img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
  };

  const morphBetween = () => {
      // Morph whole table from first to last frame
      if (frames.length < 3) return;
      const first = frames[0];
      const last = frames[frames.length-1];
      const count = frames.length;
      
      const newFrames = frames.map((_, i) => {
          if (i === 0) return first;
          if (i === count-1) return last;
          return interpolateFrames(first, last, i / (count - 1));
      });
      setFrames(newFrames);
  };

  const downloadWav = () => {
      const blob = exportWavetableToWav(frames);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wavetable.wav';
      a.click();
      URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)]">
            <Activity className="text-gray-900 w-6 h-6" />
          </div>
          <div>
             <h1 className="text-2xl font-bold tracking-tight text-white">WaveForge</h1>
             <p className="text-xs text-gray-400">Pro Wavetable Architect</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-800">
               <button 
                 onClick={togglePlay}
                 className={`p-2 rounded-md transition ${isPlaying && !scanIntervalRef.current ? 'bg-cyan-600 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
                 title="Play Tone"
               >
                   {isPlaying && !scanIntervalRef.current ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
               </button>
               <div className="w-px h-6 bg-gray-800 mx-1"></div>
               <button 
                 onClick={handleScanPlayback}
                 className={`p-2 rounded-md transition ${scanIntervalRef.current ? 'bg-purple-600 text-white animate-pulse' : 'hover:bg-gray-800 text-gray-400'}`}
                 title="Scan Table"
               >
                   <Layers size={18} />
               </button>
           </div>
           
           <button 
             onClick={downloadWav}
             className="flex items-center gap-2 bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-white transition shadow-lg hover:shadow-cyan-500/20"
           >
             <Download size={18} /> Export .WAV
           </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visualizers */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           
           {/* Main Editor */}
           <section>
              <div className="flex justify-between items-end mb-2 px-1">
                  <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                    <Activity size={14} /> FRAME {currentIndex + 1} / {frames.length}
                  </h2>
                  <div className="text-xs text-gray-500 font-mono">2048 SAMPLES • 32-BIT FLOAT</div>
              </div>
              <WaveformCanvas 
                data={frames[currentIndex]} 
                onChange={handleWaveformChange} 
                isActive={mode === GeneratorMode.DRAW}
              />
           </section>

           {/* 3D View */}
           <section className="flex-1 min-h-[250px]">
               <div className="flex justify-between items-end mb-2 px-1">
                  <h2 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                    <Layers size={14} /> SPECTRAL VIEW
                  </h2>
               </div>
               <Wavetable3D 
                 frames={frames} 
                 currentIndex={currentIndex} 
                 onSelectFrame={setCurrentIndex}
               />
           </section>

           {/* Timeline / Frame Strip */}
           <section className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                 <input 
                   type="range" 
                   min="0" 
                   max={frames.length - 1} 
                   value={currentIndex} 
                   onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                   className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                 />
              </div>
              <div className="flex justify-between items-center">
                 <div className="flex gap-2">
                    <button onClick={addFrame} className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded border border-gray-700 transition">
                        <Plus size={14}/> Add Frame
                    </button>
                    <button onClick={() => setFrames([...frames, new Float32Array(frames[currentIndex])])} className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded border border-gray-700 transition">
                        <Copy size={14}/> Duplicate
                    </button>
                    <button onClick={deleteFrame} className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-red-900/30 text-red-400 border border-gray-700 px-3 py-1 rounded transition">
                        <Trash2 size={14}/> Delete
                    </button>
                 </div>
                 <button onClick={morphBetween} className="text-xs text-purple-400 hover:text-purple-300 transition font-medium">
                     Morph All (Linear)
                 </button>
              </div>
           </section>
        </div>

        {/* Right Column: Generators & Tools */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           
           {/* Generator Switcher */}
           <div className="grid grid-cols-4 gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
              {[
                { id: GeneratorMode.DRAW, icon: Activity, label: 'Draw' },
                { id: GeneratorMode.HARMONIC, icon: Layers, label: 'Harm' },
                { id: GeneratorMode.MATH, icon: Wand2, label: 'Math' },
                { id: GeneratorMode.IMAGE, icon: ImageIcon, label: 'Img' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id as GeneratorMode)}
                  className={`flex flex-col items-center justify-center py-2 rounded-md text-xs font-medium transition ${mode === item.id ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                   <item.icon size={16} className="mb-1" />
                   {item.label}
                </button>
              ))}
           </div>

           {/* Tool Content */}
           <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-inner">
              
              {mode === GeneratorMode.DRAW && (
                <div className="space-y-4">
                   <h3 className="text-lg font-medium text-white">Freehand Mode</h3>
                   <p className="text-sm text-gray-400">
                     Draw directly on the main waveform canvas. 
                     The brush applies smoothing automatically to prevent aliasing artifacts.
                   </p>
                   <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg text-sm text-blue-200">
                      Tip: Click and drag on the top canvas to shape the sound.
                   </div>
                </div>
              )}

              {mode === GeneratorMode.HARMONIC && (
                 <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Additive Synthesis</h3>
                    <p className="text-sm text-gray-400">Adjust harmonic partials to shape the timbre.</p>
                    <HarmonicEditor onChange={handleHarmonicChange} />
                 </div>
              )}

              {mode === GeneratorMode.MATH && (
                  <div className="space-y-4">
                     <h3 className="text-lg font-medium text-white">Formula Parser</h3>
                     <p className="text-sm text-gray-400">
                       Variables: <code>x</code> (0..2π), <code>t</code> (0..1), <code>i</code> (sample index).
                     </p>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500">JAVASCRIPT EXPRESSION</label>
                        <textarea 
                          value={formula}
                          onChange={(e) => setFormula(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 font-mono text-sm text-green-400 focus:outline-none focus:border-green-500 h-32"
                        />
                        <button 
                          onClick={handleFormulaGenerate}
                          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition"
                        >
                           Generate Waveform
                        </button>
                     </div>
                     <div className="text-xs text-gray-500">
                        Try: <code>Math.sin(x) * Math.random()</code>
                     </div>
                  </div>
              )}

              {mode === GeneratorMode.IMAGE && (
                  <div className="space-y-4">
                     <h3 className="text-lg font-medium text-white">Image to Wavetable</h3>
                     <p className="text-sm text-gray-400">
                       Converts image luminance to amplitude. Drag & drop or select a file.
                     </p>
                     <label className="block w-full border-2 border-dashed border-gray-700 hover:border-cyan-500 rounded-xl p-8 text-center cursor-pointer transition group">
                        <div className="mx-auto w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-3 group-hover:bg-cyan-900/30 transition">
                           <ImageIcon className="text-gray-400 group-hover:text-cyan-400" />
                        </div>
                        <span className="text-sm text-gray-300 font-medium">Click to Upload Image</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                     </label>
                  </div>
              )}
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;