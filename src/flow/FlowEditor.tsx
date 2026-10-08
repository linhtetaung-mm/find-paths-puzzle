"use client";

import React, { useState } from 'react';
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
  const [editorBoard, setEditorBoard] = useState(() => ({
    size,
    grid: new Array<number>(size * size).fill(0),
  }));
  const { grid } = editorBoard;
  const [selectedNumber, setSelectedNumber] = useState<number>(1);
  const [isEraserMode, setIsEraserMode] = useState(false);

  // Reset before rendering a changed size; imported boards carry their own size.
  if (editorBoard.size !== size) {
    setEditorBoard({ size, grid: new Array<number>(size * size).fill(0) });
  }

  const handleCellClick = (index: number) => {
    if (isSolving) return;
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
    setEditorBoard({ size, grid: newGrid });
    if (onClearSolution) onClearSolution(); 
  };

  const clearBoard = () => {
    setEditorBoard({ size, grid: new Array<number>(size * size).fill(0) });
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
                setEditorBoard({ size: data.size, grid: data.grid });
                if (onClearSolution) onClearSolution();
            } else {
                alert("Invalid JSON format.");
            }
        } catch {
            alert("Error parsing JSON file.");
        }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  return (
    <div className="editor-layout">
      <aside className="editor-tools">
        <span className="eyebrow">YOUR PALETTE</span>
        <h2>Start with a pair.</h2>
        <p>Choose a number, then tap two squares to place its endpoints.</p>
        <div className="palette">
          {Array.from({ length: size - 1 }, (_, i) => i + 1).map(num => <button key={num} disabled={isSolving}
            aria-label={`Number ${num}`} aria-pressed={selectedNumber === num && !isEraserMode}
            className={selectedNumber === num && !isEraserMode ? 'palette-color selected' : 'palette-color'}
            onClick={() => { setSelectedNumber(num); setIsEraserMode(false); }} style={{ backgroundColor: PATH_COLORS[num] }}>{num}<small>{grid.filter(value => value === num).length}/2</small></button>)}
        </div>
        <div className="tool-actions"><button disabled={isSolving} aria-pressed={isEraserMode} className={isEraserMode ? 'secondary-button selected' : 'secondary-button'} onClick={() => setIsEraserMode(!isEraserMode)}>Eraser Tool</button>
          <button disabled={isSolving} className="secondary-button" onClick={clearBoard}>Clear Matrix</button></div>
        <p className="tool-note">Tip: tap a filled square to replace its number. Every number needs exactly two endpoints.</p>
      </aside>
      <div className="editor-stage">
        <div className="board-frame"><div className="board-surface">
          <svg className="path-layer" viewBox="0 0 1000 1000" aria-hidden="true">
            {solutionPaths?.map((path, i) => <PolyLine key={i} cells={path} size={size} color={PATH_COLORS[grid[path[0]]]} isActive={isSolving || false} />)}
          </svg>
          <div className="puzzle-grid editor-grid" data-board="editor" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}>
            {grid.map((value, i) => <button key={i} disabled={isSolving} aria-label={`Row ${Math.floor(i / size) + 1}, column ${i % size + 1}${value ? `, number ${value}` : ', empty'}`}
              onClick={() => handleCellClick(i)} className="puzzle-cell cursor-crosshair">
              {value !== 0 && <span className="endpoint" style={{ backgroundColor: PATH_COLORS[value] }}>{value}</span>}
            </button>)}
          </div>
        </div></div>
        <div className="editor-actions"><button disabled={isSolving} onClick={validateAndSolve} className="primary-button" aria-label="Execute AI Solver">{isSolving ? 'Finding a solution…' : 'Find the flow'} <span>→</span></button>
          <label className={`secondary-button import-button ${isSolving ? 'disabled' : ''}`}>Import JSON<input type="file" accept=".json" disabled={isSolving} onChange={handleImportJSON} /></label>
          <button disabled={isSolving} onClick={handleExportJSON} className="secondary-button">Export JSON</button></div>
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

  return <polyline points={points} fill="none" stroke={color} strokeWidth={320 / size} strokeLinecap="round" strokeLinejoin="round" opacity={isActive ? 0.8 : 1} style={{ filter: isActive ? `drop-shadow(0 0 12px ${color})` : 'none', transition: 'all 0.1s' }} />;
};

export default FlowEditor;