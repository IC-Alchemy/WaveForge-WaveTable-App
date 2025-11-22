import React, { useEffect, useState } from 'react';

interface HarmonicEditorProps {
  onChange: (harmonics: number[]) => void;
}

const HarmonicEditor: React.FC<HarmonicEditorProps> = ({ onChange }) => {
  const [harmonics, setHarmonics] = useState<number[]>(new Array(16).fill(0).map((_, i) => i === 0 ? 1 : 0));

  const updateHarmonic = (index: number, value: number) => {
    const newHarmonics = [...harmonics];
    newHarmonics[index] = value;
    setHarmonics(newHarmonics);
  };
  
  // Debounce updates to parent
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(harmonics);
    }, 50);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [harmonics]);

  const reset = () => {
    setHarmonics(new Array(16).fill(0).map((_, i) => i === 0 ? 1 : 0));
  };

  const randomize = () => {
    setHarmonics(new Array(16).fill(0).map(() => Math.random()));
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 h-64 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Additive Harmonics</span>
        <div className="flex gap-2">
             <button onClick={randomize} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white transition">Rand</button>
             <button onClick={reset} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white transition">Reset</button>
        </div>
      </div>
      
      <div className="flex-1 flex gap-1 items-end justify-between">
        {harmonics.map((val, i) => (
          <div key={i} className="flex-1 flex flex-col items-center h-full group relative">
            <div className="relative w-full h-full bg-gray-900 rounded overflow-hidden">
               <div 
                 className="absolute bottom-0 left-0 right-0 bg-purple-500 transition-all duration-150 group-hover:bg-purple-400"
                 style={{ height: `${val * 100}%` }}
               />
               <input 
                 type="range"
                 min="0"
                 max="1"
                 step="0.01"
                 value={val}
                 onChange={(e) => updateHarmonic(i, parseFloat(e.target.value))}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize"
                 title={`Harmonic ${i + 1}: ${Math.round(val * 100)}%`}
               />
            </div>
            <span className="text-[10px] text-gray-500 mt-1">{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HarmonicEditor;