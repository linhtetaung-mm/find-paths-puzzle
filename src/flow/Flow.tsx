"use client";

import { useState, useEffect, useRef } from 'react';
import FlowGame from './FlowGame';
import FlowEditor from './FlowEditor';

const Flow = () => {
  const [view, setView] = useState<'play' | 'solve'>('play');
  const [solverSize, setSolverSize] = useState<number>(5);
  
  // Engine & UI State
  const [solverState, setSolverState] = useState<number[][]>([]);
  const [isSolving, setIsSolving] = useState(false);
  const [stepsExplored, setStepsExplored] = useState(0);
  const [solveTime, setSolveTime] = useState(0);
  
  // Keep a persistent reference to the Web Worker
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // 1. Initialize the worker
    workerRef.current = new Worker(new URL('./flowsolver.worker.ts', import.meta.url), {type: 'module'});
    
    // 2. Listen for messages from the background thread
    workerRef.current.onmessage = async (e: MessageEvent) => {
      const { type, steps, solution, duration } = e.data;

      if (type === 'progress') {
        // Update the real-time "Search Space" counter
        setStepsExplored(steps);
      } 
      else if (type === 'result') {
        setIsSolving(false); 
        setSolveTime(duration);
        setStepsExplored(0); // Reset counter so it doesn't linger

        if (solution) {
          const maxLen = Math.max(...solution.map((p: number[]) => p.length));

          // 3. The Animation Loop: Yield to the main thread to prevent UI freezing
          for (let step = 2; step <= maxLen; step++) {
            // Create a fresh array reference every frame
            const frame = solution.map((path: number[]) => path.slice(0, step));
            setSolverState(frame);
            
            // Wait 80ms before the next frame. This is crucial for large 
            // matrices so the browser has time to actually draw the SVG.
            await new Promise(r => setTimeout(r, 80)); 
          }
        } else {
          alert("System Failure: No valid 100% filled solution found.");
        }
      }
    };

    // 4. Cleanup on unmount
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const runAISolver = (userGrid: number[]) => {
    // Reset the board and UI before starting
    setSolverState([]); 
    setStepsExplored(0);
    setSolveTime(0);
    setIsSolving(true);
    
    // Dispatch the payload to the background worker
    workerRef.current?.postMessage({ size: solverSize, grid: userGrid });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-500/30">
      <nav className="flex justify-center gap-3 p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
        <button 
          onClick={() => setView('play')} 
          className={`px-4 sm:px-6 py-2 rounded-full font-bold text-[11px] sm:text-xs uppercase tracking-widest transition-all cursor-pointer ${
            view === 'play' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Mission Mode
        </button>
        <button 
          onClick={() => setView('solve')} 
          className={`px-4 sm:px-6 py-2 rounded-full font-bold text-[11px] sm:text-xs uppercase tracking-widest transition-all cursor-pointer ${
            view === 'solve' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          AI Solver Lab
        </button>
      </nav>

      {/* Added responsive padding wrapper to prevent edge clipping */}
      <main className="container mx-auto px-4 py-6 sm:py-8 relative max-w-xl">
        
        {/* 🎮 FlowGame Panel */}
        <div className={view === 'play' ? 'block' : 'hidden'}>
          <FlowGame /> 
        </div>

        {/* 🤖 AI Solver Lab Panel */}
        <div className={view === 'solve' ? 'flex flex-col items-center w-full' : 'hidden'}>
          
          {/* Mobile-Friendly Matrix Size Selector */}
          {/* Uses flex-col on tiny screens, flex-row on mobile up, with an overflow-x-auto safety fallback */}
          <div className="w-full mb-5 flex flex-col sm:flex-row gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center sm:text-left self-center sm:px-2 py-1 sm:py-0">
              Matrix Size
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 justify-between sm:justify-start scrollbar-none snap-x touch-pan-x">
              {[5, 6, 7, 8, 9, 10, 11].map(size => (
                <button 
                  key={size}
                  onClick={() => { setSolverSize(size); setSolverState([]); }}
                  className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors snap-center min-w-[42px] cursor-pointer ${
                    solverSize === size ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>

          {/* Telemetry Dashboard - Tightened padding & fonts for mobile displays */}
          <div className="w-full grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-900 border border-slate-800 p-2.5 sm:p-3 rounded-xl flex flex-col items-center shadow-lg">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Search Space</span>
              <span className="text-base sm:text-lg font-mono text-blue-400 font-semibold truncate max-w-full">
                {stepsExplored.toLocaleString()} <span className="text-[9px] text-slate-600 block sm:inline">states</span>
              </span>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 p-2.5 sm:p-3 rounded-xl flex flex-col items-center shadow-lg">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Execution Time</span>
              <span className="text-base sm:text-lg font-mono text-emerald-400 font-semibold truncate max-w-full">
                {isSolving ? (
                  <span className="animate-pulse text-purple-400 text-xs sm:text-sm">Thinking...</span>
                ) : (
                  `${(solveTime / 1000).toFixed(2)}s`
                )}
              </span>
            </div>
          </div>

          {/* The Interactive Editor - Stretched completely to full width */}
          <div className="w-full touch-none">
            <FlowEditor 
              size={solverSize} 
              onSizeChange={setSolverSize}
              onSolve={runAISolver} 
              solutionPaths={solverState}
              isSolving={isSolving}
              onClearSolution={() => {
                setSolverState([]);
                setSolveTime(0);
              }}
            />
          </div>
        </div>

      </main>
    </div>
  );

};

export default Flow;