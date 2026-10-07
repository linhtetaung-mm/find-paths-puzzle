"use client";

import React, { useState } from 'react';
import { FlowGenerator } from './FlowGenerator';
import type { BoardConfig, DifficultyLevel } from './types';
import { PATH_COLORS } from './colorMap';

interface CompletedPath { pairId: number; cells: number[]; }

const FlowGame: React.FC = () => {
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [board, setBoard] = useState<BoardConfig>(() => FlowGenerator.generateLevel(1));
  
  const [completedPaths, setCompletedPaths] = useState<CompletedPath[]>([]);
  const [activePairId, setActivePairId] = useState<number | null>(null);
  const [activePathCells, setActivePathCells] = useState<number[]>([]);

  const startNewGame = (newLevel: DifficultyLevel) => {
    const config = FlowGenerator.generateLevel(newLevel);
    setBoard(config);
    setCompletedPaths([]);
    setActivePairId(null);
    setActivePathCells([]);
  };


  const handlePointerDown = (index: number, cellValue: number) => {
    if (cellValue === 0) return;
    setCompletedPaths(prev => prev.filter(p => p.pairId !== cellValue));
    setActivePairId(cellValue);
    setActivePathCells([index]);
  };

  const handlePointerEnter = (index: number) => {
    if (activePairId === null) return;
    const lastIndex = activePathCells[activePathCells.length - 1];
    const rowDiff = Math.abs(Math.floor(index / board.size) - Math.floor(lastIndex / board.size));
    const colDiff = Math.abs((index % board.size) - (lastIndex % board.size));
    const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);

    if (!isAdjacent) return;
    
    // Allow backtracking
    if (activePathCells.length > 1 && activePathCells[activePathCells.length - 2] === index) {
      setActivePathCells(prev => prev.slice(0, -1));
      return;
    }
    
    if (activePathCells.includes(index)) return;
    if (completedPaths.some(p => p.cells.includes(index))) return;
    
    const targetCellValue = board.grid[index];
    if (targetCellValue !== 0 && targetCellValue !== activePairId) return;

    const newPath = [...activePathCells, index];
    setActivePathCells(newPath);

    if (targetCellValue === activePairId) {
        // RULE #5: Enforce path > 2 squares. If it's too short, do not register as complete.
        if (newPath.length <= 2) {
            return;
        }

        setCompletedPaths(prev => [...prev, { pairId: activePairId, cells: newPath }]);
        setActivePairId(null);
        setActivePathCells([]);
    }
  };

  const handlePointerUp = () => {
    setActivePairId(null);
    setActivePathCells([]);
  };

  const isBoardFull = () => {
    const occupiedCount = completedPaths.reduce((acc, p) => acc + p.cells.length, 0);
    return occupiedCount === board.size * board.size;
  };
  const isLevelComplete = completedPaths.length === board.pairs && isBoardFull();

  return (
    <div className="bg-slate-950 flex flex-col items-center justify-center p-4 font-mono select-none" onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      
      <div className="mb-8 text-center space-y-4 w-full max-w-2xl">
        <h1 className="text-2xl font-black text-slate-200 tracking-widest uppercase">Network Router</h1>
        <div className="flex gap-2 justify-center flex-wrap">
          {([1, 2, 3, 4, 5, 6, 7] as DifficultyLevel[]).map(l => (
            <button key={l} onClick={() => { setLevel(l); startNewGame(l); }} className={`px-3 py-1 text-xs font-bold rounded ${level === l ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              Lvl {l}
            </button>
          ))}
        </div>
      </div>

      <div className="relative bg-slate-900 border-2 border-slate-800 rounded-xl shadow-2xl p-4 overflow-hidden" style={{ width: 'min(90vw, 550px)', aspectRatio: '1 / 1', touchAction: 'none' }}>
        <div className="w-full h-full grid relative" style={{ gridTemplateColumns: `repeat(${board.size}, 1fr)`, gridTemplateRows: `repeat(${board.size}, 1fr)`, zIndex: 1 }}>
            {board.grid.map((cellValue, index) => (
            <div key={index} onPointerDown={(e) => { (e.target as HTMLElement).releasePointerCapture(e.pointerId); handlePointerDown(index, cellValue); }} onPointerEnter={() => handlePointerEnter(index)} className="relative flex items-center justify-center border border-white/5">
                {cellValue !== 0 && ( <div className="w-3/4 h-3/4 rounded-full flex items-center justify-center text-slate-950 font-black relative shadow-inner" style={{ backgroundColor: PATH_COLORS[cellValue], zIndex: 30 }}>{cellValue}</div> )}
            </div>
            ))}
        </div>

        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ zIndex: 20, padding: '1rem' }}>
            {completedPaths.map((path, i) => ( <PolyLine key={i} cells={path.cells} size={board.size} color={PATH_COLORS[path.pairId]} /> ))}
            {activePairId && activePathCells.length > 0 && ( <PolyLine cells={activePathCells} size={board.size} color={PATH_COLORS[activePairId]} isActive /> )}
        </svg>
      </div>

      <div className="mt-8 text-center h-12">
        {isLevelComplete ? (
          <div className="text-emerald-400 font-bold uppercase tracking-[0.3em] animate-pulse">Matrix Synced</div>
        ) : (
          <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Links: {completedPaths.length} / {board.pairs}</div>
        )}
      </div>
    </div>
  );
};

const PolyLine = ({ cells, size, color, isActive = false }: { cells: number[], size: number, color: string, isActive?: boolean }) => {
    if (cells.length < 2) return null;
    const points = cells.map(index => {
      const r = Math.floor(index / size), c = index % size;
      return `${((c + 0.5) / size) * 1000},${((r + 0.5) / size) * 1000}`;
    }).join(' ');
  
    return (
      <polyline points={points} fill="none" stroke={color} strokeWidth={isActive ? 35 : 45} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.1s ease', filter: isActive ? `drop-shadow(0 0 8px ${color})` : 'none', opacity: isActive ? 0.8 : 1 }} />
    );
};

export default FlowGame;