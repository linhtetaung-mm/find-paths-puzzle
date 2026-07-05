/**
 * FlowSolverEngine.ts
 * 
 * An optimized backtracking solver for the Flow puzzle.
 * Uses advanced heuristics to prune the search tree and solve large grids.
 */

export class VisualFlowSolver {
  private size: number;
  private grid: number[];
  private goals: Map<number, number[]>;
  private onProgress?: (steps: number) => void;
  private stepCount: number = 0;

  constructor(size: number, grid: number[], onProgress?: (steps: number) => void) {
    this.size = size;
    this.grid = [...grid]; // Working copy
    this.onProgress = onProgress;
    this.goals = new Map();
    
    // Find all start/end pairs
    grid.forEach((val, idx) => {
      if (val !== 0) {
        if (!this.goals.has(val)) this.goals.set(val, []);
        this.goals.get(val)!.push(idx);
      }
    });
  }

  solve(): number[][] | null {
    const colors = Array.from(this.goals.keys());
    const paths = new Map<number, number[]>();
    colors.forEach(c => paths.set(c, [this.goals.get(c)![0]]));

    const result = this.backtrack(colors, 0, paths);
    return result ? Array.from(result.values()) : null;
  }

  private backtrack(colors: number[], colorIdx: number, paths: Map<number, number[]>): Map<number, number[]> | null {
    this.stepCount++;
    if (this.stepCount % 5000 === 0 && this.onProgress) {
        this.onProgress(this.stepCount);
    }
    
    if (colorIdx === colors.length) {
      // Final check: Is the board 100% filled?[cite: 2, 4]
      return this.grid.every(cell => cell !== 0) ? paths : null;
    }

    const color = colors[colorIdx];
    const currentPath = paths.get(color)!;
    const lastPos = currentPath[currentPath.length - 1];
    const target = this.goals.get(color)![1];

    // Get valid neighbors
    const neighbors = this.getNeighbors(lastPos);

    for (const next of neighbors) {
      if (next === target) {
        // RULE #5: Every path must be longer than 2 squares
        if (currentPath.length < 2) continue; 

        const originalVal = this.grid[next];
        currentPath.push(next);
        
        // Try solving the next color
        const res = this.backtrack(colors, colorIdx + 1, paths);
        if (res) return res;

        currentPath.pop(); // Backtrack
        continue;
      }

      if (this.grid[next] === 0) {
        // Pruning: Don't enter a cell if it creates an isolated dead-end[cite: 4]
        if (this.isDeadEnd(next)) continue;

        this.grid[next] = color;
        currentPath.push(next);

        const res = this.backtrack(colors, colorIdx, paths);
        if (res) return res;

        // Backtrack[cite: 4]
        this.grid[next] = 0;
        currentPath.pop();
      }
    }
    return null;
  }

  private getNeighbors(pos: number): number[] {
    const neighbors: number[] = [];
    const r = Math.floor(pos / this.size);
    const c = pos % this.size;

    if (r > 0) neighbors.push(pos - this.size);
    if (r < this.size - 1) neighbors.push(pos + this.size);
    if (c > 0) neighbors.push(pos - 1);
    if (c < this.size - 1) neighbors.push(pos + 1);
    
    return neighbors;
  }

  // Basic pruning: Check if a move blocks off a cell completely[cite: 4]
  private isDeadEnd(pos: number): boolean {
    const neighbors = this.getNeighbors(pos);
    for (const n of neighbors) {
      if (this.grid[n] === 0) {
        const free = this.getNeighbors(n).filter(nn => this.grid[nn] === 0 || this.isGoal(nn)).length;
        if (free < 2) return true; 
      }
    }
    return false;
  }

  private isGoal(pos: number): boolean {
    for (const g of this.goals.values()) if (g.includes(pos)) return true;
    return false;
  }
}

// export class VisualFlowSolver {
//   private size: number;
//   private grid: number[];
//   private goals: Map<number, number[]>;
//   private onProgress?: (steps: number) => void;
//   private stepCount: number = 0;

//   /**
//    * @param size The size of the grid (e.g., 5 for 5x5, 9 for 9x9)
//    * @param grid A 1D array representing the grid (0 for empty, >0 for colors)
//    * @param onProgress Callback to report steps explored back to the UI
//    */
//   constructor(size: number, grid: number[], onProgress?: (steps: number) => void) {
//     this.size = size;
//     this.grid = [...grid]; // Working copy of the board
//     this.onProgress = onProgress;
//     this.goals = new Map();
    
//     // Find and store all start/end pairs for each color
//     grid.forEach((val, idx) => {
//       if (val !== 0) {
//         if (!this.goals.has(val)) this.goals.set(val, []);
//         this.goals.get(val)!.push(idx);
//       }
//     });
//   }

//   /**
//    * Starts the solving process.
//    * @returns An array of paths (each path is an array of indices), or null if impossible.
//    */
//   solve(): number[][] | null {
//     const colors = Array.from(this.goals.keys());
//     const paths = new Map<number, number[]>();
    
//     // Initialize paths with the starting point of each color
//     colors.forEach(c => paths.set(c, [this.goals.get(c)![0]]));

//     const result = this.backtrack(colors, paths);
//     return result ? Array.from(result.values()) : null;
//   }

//   /**
//    * The core recursive backtracking engine.
//    */
//   private backtrack(remainingColors: number[], paths: Map<number, number[]>): Map<number, number[]> | null {
//     // 1. Telemetry heartbeat
//     this.stepCount++;
//     if (this.stepCount % 5000 === 0 && this.onProgress) {
//         this.onProgress(this.stepCount);
//     }

//     // 2. Base Case: All colors connected. Check if the board is 100% full.
//     if (remainingColors.length === 0) {
//       return this.grid.every(cell => cell !== 0) ? paths : null;
//     }

//     // 3. Optimization: Pick the color that is closest to its goal
//     const color = this.getMostConstrainedColor(remainingColors, paths);
//     const currentPath = paths.get(color)!;
//     const lastPos = currentPath[currentPath.length - 1];
//     const target = this.goals.get(color)![1];

//     // 4. Explore valid neighbors
//     const neighbors = this.getNeighbors(lastPos);

//     for (const next of neighbors) {
//       // Scenario A: We hit the target goal
//       if (next === target) {
//         // RULE #5: Every path must be longer than 2 squares (Start -> Middle -> End)
//         if (currentPath.length < 2) continue; 
        
//         currentPath.push(next);
        
//         // Move on to the next color
//         const res = this.backtrack(remainingColors.filter(c => c !== color), paths);
//         if (res) return res;
        
//         // Backtrack
//         currentPath.pop();
//         continue;
//       }

//       // Scenario B: Moving into an empty cell
//       if (this.grid[next] === 0) {
//         // Pruning: Do not move here if it creates an unfillable isolated dead-end
//         if (this.isDeadEnd(next)) continue;

//         // Make the move
//         this.grid[next] = color;
//         currentPath.push(next);

//         // Recurse deeper
//         const res = this.backtrack(remainingColors, paths);
//         if (res) return res;

//         // Backtrack (undo the move)
//         this.grid[next] = 0;
//         currentPath.pop();
//       }
//     }
    
//     // No valid moves found on this branch
//     return null;
//   }

//   /**
//    * Heuristic: Returns the color whose current tip is closest to its goal.
//    * This drastically reduces the search tree by solving "tight" areas first.
//    */
//   private getMostConstrainedColor(colors: number[], paths: Map<number, number[]>): number {
//     return colors.sort((a, b) => {
//         const distA = this.getDist(paths.get(a)![paths.get(a)!.length - 1], this.goals.get(a)![1]);
//         const distB = this.getDist(paths.get(b)![paths.get(b)!.length - 1], this.goals.get(b)![1]);
//         return distA - distB;
//     })[0];
//   }

//   /**
//    * Calculates the Manhattan distance between two indices.
//    */
//   private getDist(p1: number, p2: number): number {
//     return Math.abs(Math.floor(p1 / this.size) - Math.floor(p2 / this.size)) + 
//            Math.abs((p1 % this.size) - (p2 % this.size));
//   }

//   /**
//    * Returns valid up/down/left/right neighbors on the grid.
//    */
//   private getNeighbors(pos: number): number[] {
//     const neighbors: number[] = [];
//     const r = Math.floor(pos / this.size);
//     const c = pos % this.size;

//     if (r > 0) neighbors.push(pos - this.size);             // Up
//     if (r < this.size - 1) neighbors.push(pos + this.size); // Down
//     if (c > 0) neighbors.push(pos - 1);                     // Left
//     if (c < this.size - 1) neighbors.push(pos + 1);         // Right
    
//     return neighbors;
//   }

//   /**
//    * Advanced Pruning: Checks if moving into a cell blocks off nearby empty cells.
//    * If an empty cell has fewer than 2 ways in/out, the board can never be 100% filled.
//    */
//   private isDeadEnd(pos: number): boolean {
//     const neighbors = this.getNeighbors(pos);
//     for (const n of neighbors) {
//       if (this.grid[n] === 0) {
//         // Count how many free exits this empty neighbor has
//         const freeExits = this.getNeighbors(n).filter(nn => this.grid[nn] === 0 || this.isGoal(nn)).length;
//         if (freeExits < 2) return true; 
//       }
//     }
//     return false;
//   }

//   /**
//    * Helper to check if a specific grid index contains a goal.
//    */
//   private isGoal(pos: number): boolean {
//     for (const goals of this.goals.values()) {
//         if (goals.includes(pos)) return true;
//     }
//     return false;
//   }
// }