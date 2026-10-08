"use client";

import { useState, useEffect, useRef } from 'react';
import FlowGame from './FlowGame';
import FlowEditor from './FlowEditor';

const Flow = () => {
  const [view, setView] = useState<'play' | 'solve'>('play');
  const helpRef = useRef<HTMLDialogElement>(null);

  const [solverSize, setSolverSize] = useState<number>(5);
  
  // Engine & UI State
  const [solverState, setSolverState] = useState<number[][]>([]);
  const [isSolving, setIsSolving] = useState(false);
  const [stepsExplored, setStepsExplored] = useState(0);
  const [solveTime, setSolveTime] = useState(0);
  
  // Keep a persistent reference to the Web Worker
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    let disposed = false;
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
        setSolveTime(duration);
        setStepsExplored(0); // Reset counter so it doesn't linger

        if (solution) {
          const maxLen = Math.max(...solution.map((p: number[]) => p.length));

          // 3. The Animation Loop: Yield to the main thread to prevent UI freezing
          for (let step = 2; step <= maxLen; step++) {
            if (disposed) return;
            // Create a fresh array reference every frame
            const frame = solution.map((path: number[]) => path.slice(0, step));
            setSolverState(frame);
            
            // Wait 80ms before the next frame. This is crucial for large 
            // matrices so the browser has time to actually draw the SVG.
            await new Promise(r => setTimeout(r, 80)); 
          }
        } else {
          alert("No solution fills this board. Try moving an endpoint.");
        }
        setIsSolving(false);
      }
    };
    workerRef.current.onerror = () => {
      setIsSolving(false);
      alert("The solver could not finish. Please try again.");
    };

    return () => {
      disposed = true;
      workerRef.current?.terminate();
    };
  }, []);

  const runAISolver = (userGrid: number[]) => {
    setSolverState([]);
    setStepsExplored(0);
    setSolveTime(0);
    setIsSolving(true);
    workerRef.current?.postMessage({ size: solverSize, grid: userGrid });
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Find Paths home"><span className="brand-symbol">⌁</span>Find<span>Paths</span><small>PUZZLE CLUB</small></a>
        <nav className="view-switch" aria-label="Puzzle mode">
          <button aria-pressed={view === 'play'} className={view === 'play' ? 'active' : ''} onClick={() => setView('play')}>Play</button>
          <button aria-pressed={view === 'solve'} className={view === 'solve' ? 'active' : ''} onClick={() => setView('solve')}>Solver studio</button>
        </nav>
        <button className="help-button" onClick={() => helpRef.current?.showModal()}>How to play <span>↗</span></button>
      </header>
      <main className="main-content">
        <div hidden={view !== 'play'}><FlowGame /></div>
        <section hidden={view !== 'solve'} aria-label="Solver studio">
          <div className="studio-heading"><div><span className="eyebrow">MAKE SOMETHING CONNECT</span><h1>Solver <em>studio.</em></h1><p className="intro-copy">Place two endpoints per number. Let the solver find a path through every square.</p></div><span className="studio-badge"><i /> {isSolving ? 'Finding the flow…' : 'Ready to explore'}</span></div>
          <div className="studio-toolbar"><span className="eyebrow">Grid size</span><div className="size-options">
            {[5, 6, 7, 8, 9, 10, 11].map(size => <button key={size} disabled={isSolving} aria-pressed={solverSize === size} className={solverSize === size ? 'selected' : ''}
              onClick={() => { setSolverSize(size); setSolverState([]); setSolveTime(0); }}>{size}×{size}</button>)}
          </div><div className="studio-stat"><strong>{stepsExplored.toLocaleString()}</strong><span>states explored</span></div><div className="studio-stat"><strong>{isSolving ? 'Working…' : `${(solveTime / 1000).toFixed(2)}s`}</strong><span>solve time</span></div></div>
          <FlowEditor size={solverSize} onSizeChange={setSolverSize} onSolve={runAISolver} solutionPaths={solverState} isSolving={isSolving}
            onClearSolution={() => { setSolverState([]); setSolveTime(0); }} />
        </section>
      </main>
      <footer className="site-footer"><span>Made for a quieter kind of challenge.</span><span>CONNECT · FILL · REPEAT</span></footer>
      <dialog ref={helpRef} className="help-dialog" aria-labelledby="help-title">
        <div className="dialog-heading"><span className="eyebrow">A SIMPLE IDEA</span><button className="icon-button" aria-label="Close instructions" onClick={() => helpRef.current?.close()}>×</button></div>
        <h2 id="help-title">Every square.<br /><em>One connection.</em></h2>
        <ol><li><strong>Match the numbers.</strong> Hold a numbered circle and drag to its matching partner.</li><li><strong>Give each path room.</strong> Use at least one square between endpoints. Lines cannot cross or move diagonally.</li><li><strong>Fill the whole board.</strong> Connecting every pair is only half the challenge. Leave no empty squares.</li></ol>
        <p>Slide back along your current line to undo. Start from a connected endpoint to redraw it. Use ↻ for a fresh puzzle.</p>
        <button className="primary-button" onClick={() => helpRef.current?.close()}>Let’s play →</button>
      </dialog>
    </div>
  );
};

export default Flow;
