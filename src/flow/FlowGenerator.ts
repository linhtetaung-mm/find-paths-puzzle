import type { BoardConfig, DifficultyLevel } from './types';

export class FlowGenerator {
  private static readonly SIZE_MAP: Record<DifficultyLevel, number> = {
    1: 5, 2: 6, 3: 7, 4: 8, 5: 9, 6: 10, 7: 11
  };

  public static generateLevel(level: DifficultyLevel): BoardConfig {
    const size = this.SIZE_MAP[level];
    const pairs = size - 1;
    const totalCells = size * size;

    let grid: number[] | null = null;
    let attempts = 0;

    while (!grid && attempts < 10000) {
      grid = this.attemptGeneration(size, pairs, totalCells);
      attempts++;
    }

    if (!grid) grid = new Array(totalCells).fill(0); 
    return { level, size, pairs, grid };
  }

  private static absorbEmptyCells(paths: number[][], globalUsed: Set<number>, size: number): boolean {
    let changed = true;
    while (changed) {
        changed = false;
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            const endpoints = [path[0], path[path.length - 1]];
            
            for (const edge of endpoints) {
                const neighbors = this.getValidNeighbors(edge, size, globalUsed, new Set());
                if (neighbors.length > 0) {
                    const hole = neighbors[0];
                    if (edge === path[0]) path.unshift(hole);
                    else path.push(hole);
                    
                    globalUsed.add(hole);
                    changed = true;
                    break;
                }
            }
        }
    }
    return globalUsed.size === size * size;
  }

  private static attemptGeneration(size: number, pairs: number, totalCells: number): number[] | null {
    const grid = new Array(totalCells).fill(0);
    const usedCells = new Set<number>();
    const paths: number[][] = [];

    for (let currentPair = 1; currentPair <= pairs; currentPair++) {
        const start = this.getRandomEmptyCell(totalCells, usedCells);
        if (start === null) return null; 

        const path = this.generateSnake(start, size, usedCells, totalCells);
        
        // RULE #5: Reject any path that is 2 squares or shorter
        if (path.length <= 2) return null; 

        path.forEach(cell => usedCells.add(cell));
        paths.push(path);
    }

    if (usedCells.size < totalCells) {
        const success = this.absorbEmptyCells(paths, usedCells, size);
        if (!success) return null; 
    }

    paths.forEach((path, i) => {
        const pairId = i + 1;
        grid[path[0]] = pairId;
        grid[path[path.length - 1]] = pairId;
    });

    return grid;
  }

  private static generateSnake(start: number, size: number, globalUsed: Set<number>, totalCells: number): number[] {
    let current = start;
    const path = [start];
    const localUsed = new Set<number>([start]);

    const remainingCells = totalCells - globalUsed.size;
    const targetLength = Math.max(4, Math.floor(remainingCells / (size - 1))); // Increased base target

    while (true) {
        const neighbors = this.getValidNeighbors(current, size, globalUsed, localUsed);
        if (neighbors.length === 0) break; 

        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        current = next;
        path.push(current);
        localUsed.add(current);

        // Terminate randomly only if it meets our new length criteria > 2
        if (path.length > 2 && path.length >= targetLength && Math.random() < 0.3) {
            break; 
        }
    }

    return path;
  }

  private static getValidNeighbors(pos: number, size: number, globalUsed: Set<number>, localUsed: Set<number>): number[] {
    const valid = [];
    const row = Math.floor(pos / size);
    const col = pos % size;

    const moves = [
      { r: row - 1, c: col, nextPos: pos - size },
      { r: row + 1, c: col, nextPos: pos + size },
      { r: row, c: col - 1, nextPos: pos - 1 },
      { r: row, c: col + 1, nextPos: pos + 1 },
    ];

    for (const move of moves) {
      if (move.r >= 0 && move.r < size && move.c >= 0 && move.c < size && !globalUsed.has(move.nextPos) && !localUsed.has(move.nextPos)) {
        valid.push(move.nextPos);
      }
    }
    return valid;
  }

  private static getRandomEmptyCell(totalCells: number, usedCells: Set<number>): number | null {
    const available = [];
    for (let i = 0; i < totalCells; i++) if (!usedCells.has(i)) available.push(i);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }
}