import { describe, expect, it } from 'vitest';
import { VisualFlowSolver } from '../src/flow/FlowSolverEngine';

describe('VisualFlowSolver', () => {
  it('connects endpoints while filling every cell without mutating the input', () => {
    const grid = [1, 1, 0, 0];
    const solution = new VisualFlowSolver(2, grid).solve();

    expect(solution).not.toBeNull();
    const path = solution![0];
    expect(path[0]).toBe(0);
    expect(path.at(-1)).toBe(1);
    expect([...path].sort()).toEqual([0, 1, 2, 3]);
    for (let i = 1; i < path.length; i++) {
      const rowDistance = Math.abs(Math.floor(path[i] / 2) - Math.floor(path[i - 1] / 2));
      const columnDistance = Math.abs(path[i] % 2 - path[i - 1] % 2);
      expect(rowDistance + columnDistance).toBe(1);
    }
    expect(grid).toEqual([1, 1, 0, 0]);
  });

  it('returns null when endpoints cannot connect with 100 percent fill', () => {
    expect(new VisualFlowSolver(2, [1, 0, 0, 1]).solve()).toBeNull();
  });

  it('rejects paths consisting of only two endpoint cells', () => {
    expect(new VisualFlowSolver(2, [1, 1, 2, 2]).solve()).toBeNull();
  });
});
