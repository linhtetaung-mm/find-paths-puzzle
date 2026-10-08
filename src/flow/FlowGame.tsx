import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { FlowGenerator } from './FlowGenerator';
import type { BoardConfig, DifficultyLevel } from './types';
import { PATH_COLORS } from './colorMap';

interface CompletedPath { pairId: number; cells: number[] }
interface Drag { pointerId: number; pairId: number; cells: number[] }

export default function FlowGame() {
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [board, setBoard] = useState<BoardConfig>(() => FlowGenerator.generateLevel(1));
  const [completedPaths, setCompletedPaths] = useState<CompletedPath[]>([]);
  const [activePath, setActivePath] = useState<CompletedPath | null>(null);
  // Pointer events can arrive before React commits; keep the gesture current.
  const dragRef = useRef<Drag | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const endDrag = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    setActivePath(null);
    if (drag && gridRef.current?.hasPointerCapture(drag.pointerId)) {
      gridRef.current.releasePointerCapture(drag.pointerId);
    }
  };

  const startNewGame = (newLevel: DifficultyLevel) => {
    endDrag();
    setLevel(newLevel);
    setBoard(FlowGenerator.generateLevel(newLevel));
    setCompletedPaths([]);
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current || event.isPrimary === false || event.button !== 0) return;
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-cell]');
    if (!cell) return;
    const index = Number(cell.dataset.cell);
    const pairId = board.grid[index];
    if (!pairId) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, pairId, cells: [index] };
    setCompletedPaths(paths => paths.filter(path => path.pairId !== pairId));
    setActivePath({ pairId, cells: [index] });
  };

  const extendPath = (index: number) => {
    const drag = dragRef.current;
    if (!drag) return false;
    const cells = drag.cells;
    const last = cells[cells.length - 1];
    const distance = Math.abs(Math.floor(index / board.size) - Math.floor(last / board.size))
      + Math.abs(index % board.size - last % board.size);
    if (distance !== 1) return false;
    if (cells.length > 1 && cells[cells.length - 2] === index) {
      drag.cells = cells.slice(0, -1);
      setActivePath({ pairId: drag.pairId, cells: drag.cells });
      return true;
    }
    if (cells.includes(index) || completedPaths.some(path => path.cells.includes(index))) return false;
    const value = board.grid[index];
    if (value !== 0 && value !== drag.pairId) return false;
    // Every completed path must contain at least one cell between endpoints.
    if (value === drag.pairId && cells.length < 2) return false;
    drag.cells = [...cells, index];
    if (value === drag.pairId) {
      setCompletedPaths(paths => [...paths, { pairId: drag.pairId, cells: drag.cells }]);
      // Keep ownership until pointer-up so another finger cannot take over.
      setActivePath(null);
    } else {
      setActivePath({ pairId: drag.pairId, cells: drag.cells });
    }
    return true;
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    // Once connected, wait for release instead of extending beyond the goal.
    if (drag.cells.length > 1 && board.grid[drag.cells.at(-1)!] === drag.pairId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return;
    const row = Math.floor(y / rect.height * board.size);
    const col = Math.floor(x / rect.width * board.size);
    const index = row * board.size + col;
    const last = drag.cells.at(-1)!;
    // Fill skipped cells on straight swipes, without guessing diagonal turns.
    const sameRow = Math.floor(last / board.size) === row;
    const sameCol = last % board.size === col;
    if (!sameRow && !sameCol) return;
    const step = sameRow ? Math.sign(index - last) : Math.sign(index - last) * board.size;
    if (!step) return;
    for (let next = last + step; ; next += step) {
      if (!extendPath(next) || next === index || board.grid[next] === drag.pairId) break;
    }
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) endDrag();
  };
  const filled = completedPaths.reduce((count, path) => count + path.cells.length, 0);
  const percentage = Math.round(filled / (board.size * board.size) * 100);
  const isComplete = completedPaths.length === board.pairs && filled === board.size * board.size;

  return (
    <section className="play-layout" aria-label="Play puzzle">
      <aside className="play-sidebar">
        <span className="eyebrow">A little focus. A lot of flow.</span>
        <h1>Find your<br /><em>flow.</em></h1>
        <p className="intro-copy">Connect matching numbers. Fill every square. Take the scenic route.</p>
        <div className="level-picker">
          <div className="section-label"><span>Choose your grid</span><span>01 — 07</span></div>
          <div className="level-options">
            {([1, 2, 3, 4, 5, 6, 7] as DifficultyLevel[]).map(l => (
              <button key={l} aria-label={`Lvl ${l}`} aria-pressed={level === l}
                className={level === l ? 'level-option selected' : 'level-option'} onClick={() => startNewGame(l)}>
                <strong>{l + 4}<span>×</span>{l + 4}</strong><small>Level {l}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="how-to"><span className="tip-icon">↗</span><p><strong>One continuous line</strong><br />Drag from a number to its match. Slide back to undo. Paths cannot cross.</p></div>
      </aside>
      <div className="play-stage">
        <div className="board-heading"><div><span className="eyebrow">THE DAILY MOMENT OF ZEN</span><h2>Level {level} <span>/ {board.size} × {board.size}</span></h2></div>
          <button className="icon-button" aria-label="New puzzle" title="New puzzle" onClick={() => startNewGame(level)}>↻</button>
        </div>
        <div className="board-frame">
          <div className="board-surface">
            <div ref={gridRef} className="puzzle-grid" data-board="play" style={{ gridTemplateColumns: `repeat(${board.size}, 1fr)`, gridTemplateRows: `repeat(${board.size}, 1fr)` }}
              onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}>
              {board.grid.map((value, index) => <div key={index} data-cell={index} className="puzzle-cell">
                {value !== 0 && <span className="endpoint" style={{ backgroundColor: PATH_COLORS[value] }}>{value}</span>}
              </div>)}
            </div>
            <svg className="path-layer" viewBox="0 0 1000 1000" aria-hidden="true">
              {completedPaths.map(path => <PolyLine key={path.pairId} cells={path.cells} size={board.size} color={PATH_COLORS[path.pairId]} />)}
              {activePath && <PolyLine cells={activePath.cells} size={board.size} color={PATH_COLORS[activePath.pairId]} active />}
            </svg>
          </div>
        </div>
        <div className="progress-card" aria-live="polite">
          <div><span className="eyebrow">{isComplete ? 'BEAUTIFULLY CONNECTED' : 'YOUR PROGRESS'}</span><strong>{isComplete ? 'Puzzle complete!' : `Links: ${completedPaths.length} / ${board.pairs}`}</strong></div>
          <div className="fill-metric"><strong>{percentage}<span>%</span></strong><span>board filled</span></div>
          <div className="progress-track"><div style={{ width: `${percentage}%` }} /></div>
        </div>
        {isComplete && <button className="primary-button" onClick={() => startNewGame(level)}>Play another puzzle →</button>}
        <p className="board-caption">No timer. No rush. Just one square at a time.</p>
      </div>
    </section>
  );
}

function PolyLine({ cells, size, color, active = false }: { cells: number[]; size: number; color: string; active?: boolean }) {
  if (cells.length < 2) return null;
  const points = cells.map(index => `${((index % size + 0.5) / size) * 1000},${((Math.floor(index / size) + 0.5) / size) * 1000}`).join(' ');
  return <polyline points={points} fill="none" stroke={color} strokeWidth={320 / size} strokeLinecap="round" strokeLinejoin="round" opacity={active ? 0.65 : 0.85} />;
}
