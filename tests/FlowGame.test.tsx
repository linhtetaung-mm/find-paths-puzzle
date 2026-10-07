import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FlowGame from '../src/flow/FlowGame';
import { FlowGenerator } from '../src/flow/FlowGenerator';
import type { DifficultyLevel } from '../src/flow/types';

vi.mock('../src/flow/FlowGenerator', () => ({
  FlowGenerator: { generateLevel: vi.fn() },
}));

beforeEach(() => {
  // Fixed boards isolate game interactions from random puzzle generation.
  vi.mocked(FlowGenerator.generateLevel).mockImplementation((level: DifficultyLevel) => {
    const size = level + 4;
    const grid = new Array<number>(size * size).fill(0);
    grid[0] = grid[2] = 1;
    return { level, size, grid, pairs: 1 };
  });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const startPath = (container: HTMLElement) => {
  const cells = container.querySelector('.grid')!.children;
  // jsdom does not implement browser pointer capture.
  Object.defineProperty(cells[0], 'releasePointerCapture', { value: vi.fn() });
  fireEvent.pointerDown(cells[0], { pointerId: 1 });
  return cells;
};

const completePath = (container: HTMLElement) => {
  const cells = startPath(container);
  fireEvent.pointerEnter(cells[1]);
  fireEvent.pointerEnter(cells[2]);
  expect(screen.getByText('Links: 1 / 1')).toBeTruthy();
};

describe('FlowGame', () => {
  it('initializes level one and connects adjacent cells into a completed path', () => {
    const { container } = render(<FlowGame />);
    expect(container.querySelector('.grid')!.children).toHaveLength(25);
    expect(FlowGenerator.generateLevel).toHaveBeenCalledExactlyOnceWith(1);
    completePath(container);
    expect(container.querySelectorAll('polyline')).toHaveLength(1);
  });

  it('generates the selected level once and clears completed paths', () => {
    const { container } = render(<FlowGame />);
    completePath(container);
    vi.mocked(FlowGenerator.generateLevel).mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Lvl 2' }));

    expect(FlowGenerator.generateLevel).toHaveBeenCalledExactlyOnceWith(2);
    expect(container.querySelector('.grid')!.children).toHaveLength(36);
    expect(screen.getByText('Links: 0 / 1')).toBeTruthy();
    expect(container.querySelectorAll('polyline')).toHaveLength(0);
  });

  it('starts a fresh game when the current level is clicked again', () => {
    const { container } = render(<FlowGame />);
    completePath(container);
    vi.mocked(FlowGenerator.generateLevel).mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Lvl 1' }));

    expect(FlowGenerator.generateLevel).toHaveBeenCalledExactlyOnceWith(1);
    expect(screen.getByText('Links: 0 / 1')).toBeTruthy();
    expect(container.querySelectorAll('polyline')).toHaveLength(0);
  });

  it('discards an unfinished drag when changing levels', () => {
    const { container } = render(<FlowGame />);
    const cells = startPath(container);
    fireEvent.pointerEnter(cells[1]);
    expect(container.querySelectorAll('polyline')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Lvl 2' }));

    expect(container.querySelectorAll('polyline')).toHaveLength(0);
    expect(screen.getByText('Links: 0 / 1')).toBeTruthy();
  });
});
