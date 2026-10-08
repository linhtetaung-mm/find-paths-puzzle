import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FlowGame from '../src/flow/FlowGame';
import { FlowGenerator } from '../src/flow/FlowGenerator';
import type { DifficultyLevel } from '../src/flow/types';

vi.mock('../src/flow/FlowGenerator', () => ({ FlowGenerator: { generateLevel: vi.fn() } }));

// jsdom has no layout or PointerEvent; preserve the actual event coordinates.
class TestPointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  isPrimary: boolean;
  constructor(type: string, options: PointerEventInit = {}) {
    super(type, options);
    this.pointerId = options.pointerId ?? 1;
    this.pointerType = options.pointerType ?? 'touch';
    this.isPrimary = options.isPrimary ?? true;
  }
}

beforeEach(() => {
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  vi.mocked(FlowGenerator.generateLevel).mockImplementation((level: DifficultyLevel) => {
    const size = level + 4;
    const grid = new Array<number>(size * size).fill(0);
    grid[0] = grid[2] = 1;
    return { level, size, grid, pairs: 1 };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); vi.unstubAllGlobals(); });

function setup() {
  const { container } = render(<FlowGame />);
  const grid = container.querySelector<HTMLElement>('[data-board="play"]')!;
  vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 500, height: 500, right: 510, bottom: 520, x: 10, y: 20, toJSON: () => ({}) });
  Object.defineProperties(grid, {
    setPointerCapture: { value: vi.fn() },
    hasPointerCapture: { value: vi.fn(() => true) },
    releasePointerCapture: { value: vi.fn() },
  });
  const down = (index = 0, pointerId = 1, pointerType = 'touch') => fireEvent.pointerDown(grid.children[index], { pointerId, pointerType, button: 0 });
  // Move on the captured GRID, never enter an individual cell.
  const move = (index: number, pointerId = 1) => fireEvent.pointerMove(grid, { clientX: 10 + (index % 5 + .5) * 100, clientY: 20 + (Math.floor(index / 5) + .5) * 100, pointerId });
  const up = (pointerId = 1) => fireEvent.pointerUp(grid, { pointerId });
  return { container, grid, down, move, up };
}

function completePath(game: ReturnType<typeof setup>) {
  game.down(); game.move(1); game.move(2);
  expect(screen.getByText('Links: 1 / 1')).toBeTruthy();
}

describe('FlowGame pointer interaction', () => {
  it('initializes once and draws a touch path using captured movement', () => {
    const game = setup();
    expect(game.grid.children).toHaveLength(25);
    expect(FlowGenerator.generateLevel).toHaveBeenCalledExactlyOnceWith(1);
    completePath(game);
    expect(game.grid.setPointerCapture).toHaveBeenCalledWith(1);
    expect(game.container.querySelectorAll('polyline')).toHaveLength(1);
    game.up();
    expect(game.grid.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(screen.getByText('Links: 1 / 1')).toBeTruthy();
  });

  it('supports the same drawing gesture with a mouse', () => {
    const game = setup(); game.down(0, 1, 'mouse'); game.move(2); game.up();
    expect(screen.getByText('Links: 1 / 1')).toBeTruthy();
  });

  it('fills skipped adjacent cells in a fast straight swipe', () => {
    const game = setup(); game.down(); game.move(2);
    expect(screen.getByText('Links: 1 / 1')).toBeTruthy();
    expect(game.container.querySelector('polyline')!.getAttribute('points')!.split(' ')).toHaveLength(3);
  });

  it('backtracks without completing a line', () => {
    const game = setup(); game.down(); game.move(5); game.move(10); game.move(5);
    expect(game.container.querySelector('polyline')!.getAttribute('points')!.split(' ')).toHaveLength(2);
    expect(screen.getByText('Links: 0 / 1')).toBeTruthy();
  });

  it('ignores diagonal jumps and positions outside the board', () => {
    const game = setup(); game.down(); game.move(6);
    fireEvent.pointerMove(game.grid, { pointerId: 1, clientX: -10, clientY: 20 });
    expect(game.container.querySelectorAll('polyline')).toHaveLength(0);
    game.move(2);
    expect(screen.getByText('Links: 1 / 1')).toBeTruthy();
  });

  it('ignores a second finger, including its release', () => {
    const game = setup(); game.down(); game.down(2, 2); game.move(2, 2); game.up(2);
    expect(screen.getByText('Links: 0 / 1')).toBeTruthy();
    game.move(2);
    expect(screen.getByText('Links: 1 / 1')).toBeTruthy();
  });

  it.each(['pointerCancel', 'lostPointerCapture'] as const)('clears an unfinished drag on %s', event => {
    const game = setup(); game.down(); game.move(5);
    expect(game.container.querySelectorAll('polyline')).toHaveLength(1);
    fireEvent[event](game.grid, { pointerId: 1 }); game.move(2);
    expect(game.container.querySelectorAll('polyline')).toHaveLength(0);
    expect(screen.getByText('Links: 0 / 1')).toBeTruthy();
  });

  it('does not extend a completed line beyond its endpoint', () => {
    const game = setup(); completePath(game); game.move(3);
    expect(game.container.querySelector('polyline')!.getAttribute('points')!.split(' ')).toHaveLength(3);
  });

  it('redraws an already completed pair without duplicating it', () => {
    const game = setup(); completePath(game); game.up();
    game.down(2); game.move(1); game.move(0); game.up();
    expect(screen.getByText('Links: 1 / 1')).toBeTruthy();
    expect(game.container.querySelectorAll('polyline')).toHaveLength(1);
  });

  it('blocks crossing a completed path', () => {
    vi.mocked(FlowGenerator.generateLevel).mockImplementation(() => {
      const grid = new Array<number>(25).fill(0);
      grid[5] = grid[9] = 1;
      grid[2] = grid[12] = 2;
      return { level: 1, size: 5, grid, pairs: 2 };
    });
    const game = setup(); game.down(5); game.move(9); game.up();
    game.down(2); game.move(12); game.up();
    expect(screen.getByText('Links: 1 / 2')).toBeTruthy();
    expect(game.container.querySelectorAll('polyline')).toHaveLength(1);
  });

  it('generates the selected level once and clears paths', () => {
    const game = setup(); completePath(game);
    vi.mocked(FlowGenerator.generateLevel).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Lvl 2' }));
    expect(FlowGenerator.generateLevel).toHaveBeenCalledExactlyOnceWith(2);
    expect(game.grid.children).toHaveLength(36);
    expect(screen.getByText('Links: 0 / 1')).toBeTruthy();
    expect(game.container.querySelectorAll('polyline')).toHaveLength(0);
  });

  it('starts a fresh game when the current level is clicked again', () => {
    const game = setup(); completePath(game);
    vi.mocked(FlowGenerator.generateLevel).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Lvl 1' }));
    expect(FlowGenerator.generateLevel).toHaveBeenCalledExactlyOnceWith(1);
    expect(screen.getByText('Links: 0 / 1')).toBeTruthy();
  });

  it('discards an unfinished drag when changing levels', () => {
    const game = setup(); game.down(); game.move(5);
    fireEvent.click(screen.getByRole('button', { name: 'Lvl 2' }));
    expect(game.container.querySelectorAll('polyline')).toHaveLength(0);
  });
});
