"use client";

import React, { useState, useEffect } from 'react';
import { PATH_COLORS } from './colorMap';
import { VisualFlowSolver } from './FlowSolverEngine';

interface FlowEditorProps {
  size: number;
  onSizeChange: (newSize: number) => void;
  onSolve: (grid: number[]) => void;
  solutionPaths?: number[][];
  isSolving?: boolean;
  onClearSolution?: () => void;
}

const FlowEditor: React.FC<FlowEditorProps> = ({ size, onSizeChange, onSolve, solutionPaths, isSolving, onClearSolution }) => {
  const [grid, setGrid] = useState<number[]>(new Array(size * size).fill(0));
  const [selectedNumber, setSelectedNumber] = useState<number>(1);
  const [isEraserMode, setIsEraserMode] = useState(false);

  useEffect(() => {
      if (grid.length !== size * size) {
          setGrid(new Array(size * size).fill(0));
      }
  }, [size]);

  const handleCellClick = (index: number) => {
    const newGrid = [...grid];
    if (isEraserMode) {
      newGrid[index] = 0;
    } else {
      const currentCount = newGrid.filter(val => val === selectedNumber).length;
      if (currentCount < 2 || newGrid[index] === selectedNumber) {
        newGrid[index] = selectedNumber;
      } else {
        alert(`Number ${selectedNumber} already has two endpoints.`);
        return;
      }
    }
    setGrid(newGrid);
    if (onClearSolution) onClearSolution(); 
  };

  const clearBoard = () => {
    setGrid(new Array(size * size).fill(0));
    if (onClearSolution) onClearSolution();
  };

  const validateAndSolve = () => {
    const uniqueNumbers = Array.from(new Set(grid.filter(n => n !== 0)));
    const isValid = uniqueNumbers.every(n => grid.filter(val => val === n).length === 2);

    if (uniqueNumbers.length === 0) return alert("Place some numbers first!");
    if (!isValid) return alert("Each number must have exactly two endpoints.");

    onSolve(grid);
  };

  const handleExportJSON = () => {
    const engine = new VisualFlowSolver(size, grid);
    const solution = engine.solve();

    if (!solution) {
        alert("Cannot export: This board has no valid 100% fill solution.");
        return;
    }

    const data = { size, grid, solution };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-board-${size}x${size}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            if (data.size && data.grid && data.solution) {
                onSizeChange(data.size);
                setGrid(data.grid);
                if (onClearSolution) onClearSolution();
            } else {
                alert("Invalid JSON format.");
            }
        } catch (err) {
            alert("Error parsing JSON file.");
        }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start justify-center p-8 bg-slate-950 text-slate-200 min-h-screen font-mono">
      
      {/* Sidebar UI */}
      <div className="w-full md:w-56 space-y-6 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl z-10">
        <h2 className="text-xs uppercase tracking-widest text-blue-500 font-bold">Neural Toolkit</h2>
        
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: size - 1 }, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => { setSelectedNumber(num); setIsEraserMode(false); }}
              className={`h-10 rounded border transition-all ${selectedNumber === num && !isEraserMode ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
              style={{ backgroundColor: PATH_COLORS[num], boxShadow: selectedNumber === num && !isEraserMode ? `0 0 10px ${PATH_COLORS[num]}` : 'none' }}
            >
              {num}
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-2">
          <button onClick={() => setIsEraserMode(true)} className={`w-full py-2 text-xs rounded border transition-colors ${isEraserMode ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-slate-800 border-transparent text-slate-400'}`}>
            Eraser Tool
          </button>
          <button onClick={clearBoard} className="w-full py-2 text-xs bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
            Clear Matrix
          </button>
        </div>
      </div>

      {/* Main Grid & Actions */}
      <div className="flex flex-col items-center gap-6">
        
        {/* Visual Engine Wrapper */}
        <div 
          className="relative bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl overflow-hidden"
          style={{ width: 'min(80vw, 500px)', aspectRatio: '1/1', padding: '0.5rem' }}
        >
          {/* Layer 1: SVG Paths (z-10) */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 1000 1000" style={{ zIndex: 10, padding: '0.5rem' }}>
            {solutionPaths?.map((path, i) => (
              <PolyLine key={i} cells={path} size={size} color={PATH_COLORS[grid[path[0]]]} isActive={isSolving || false} />
            ))}
          </svg>

          {/* Layer 2: Grid and Circles (z-20) */}
          <div 
            className="w-full h-full grid relative"
            style={{ 
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, 
              gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`, 
              zIndex: 20 
            }}
          >
            {grid.map((val, i) => (
              <div
                key={i}
                onClick={() => handleCellClick(i)}
                className="border border-slate-800/50 flex items-center justify-center cursor-crosshair hover:bg-slate-800/50 transition-colors relative"
              >
                {val !== 0 && (
                  <div className="w-[75%] aspect-square rounded-full flex items-center justify-center text-slate-950 font-black shadow-inner" style={{ backgroundColor: PATH_COLORS[val] }}>
                    {val}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-[500px] z-10">
          <button onClick={validateAndSolve} className="col-span-2 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-900/20 transition-all">
            Execute AI Solver
          </button>
          
          <label className="flex items-center justify-center py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-300 border border-slate-700 transition-all cursor-pointer">
            Import JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
          </label>
          
          <button onClick={handleExportJSON} className="py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold uppercase tracking-widest text-emerald-400 border border-slate-700 transition-all">
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
};

const PolyLine = ({ cells, size, color, isActive }: { cells: number[], size: number, color: string, isActive: boolean }) => {
  if (!cells || cells.length < 2) return null;
  const points = cells.map(index => {
    const r = Math.floor(index / size), c = index % size;
    return `${((c + 0.5) / size) * 1000},${((r + 0.5) / size) * 1000}`;
  }).join(' ');

  return <polyline points={points} fill="none" stroke={color} strokeWidth={isActive ? "30" : "40"} strokeLinecap="round" strokeLinejoin="round" opacity={isActive ? 0.8 : 1} style={{ filter: isActive ? `drop-shadow(0 0 12px ${color})` : 'none', transition: 'all 0.1s' }} />;
};

export default FlowEditor;