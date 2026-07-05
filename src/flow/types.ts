// types.ts
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BoardConfig {
  level: DifficultyLevel;
  size: number;     // e.g., 5 for 5x5
  pairs: number;    // size - 1
  grid: number[];   // 1D array representing the board
}

export interface Path {
  id: number;       // The number being connected (1 to pairs)
  cells: number[];  // Array of flat indices
}