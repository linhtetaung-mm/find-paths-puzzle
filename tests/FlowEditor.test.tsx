import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlowEditor from '../src/flow/FlowEditor';

// Board cells have no text when empty; select the grid used for interaction.
const getCells = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.cursor-crosshair'));

const makeProps = () => ({
  size: 5,
  onSizeChange: vi.fn(),
  onSolve: vi.fn(),
  onClearSolution: vi.fn(),
});

// Model the real parent updating its size in the same import callback.
function ImportEditor(props: ReturnType<typeof makeProps>) {
  const [size, setSize] = useState(props.size);
  return <FlowEditor {...props} size={size} onSizeChange={newSize => {
    props.onSizeChange(newSize);
    setSize(newSize);
  }} />;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('FlowEditor', () => {
  it('clears endpoints and renders the correct cell count when size changes', () => {
    const props = makeProps();
    const { container, rerender } = render(<FlowEditor {...props} />);
    fireEvent.click(getCells(container)[0]);
    expect(getCells(container)[0].textContent).toBe('1');

    rerender(<FlowEditor {...props} size={6} />);

    expect(getCells(container)).toHaveLength(36);
    expect(getCells(container).every(cell => cell.textContent === '')).toBe(true);
  });

  it('preserves endpoints on rerenders with the same size and submits them', () => {
    const props = makeProps();
    const { container, rerender } = render(<FlowEditor {...props} />);
    fireEvent.click(getCells(container)[0]);
    fireEvent.click(getCells(container)[24]);

    rerender(<FlowEditor {...props} isSolving={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Execute AI Solver' }));

    const expectedGrid = new Array<number>(25).fill(0);
    expectedGrid[0] = expectedGrid[24] = 1;
    expect(props.onSolve).toHaveBeenCalledWith(expectedGrid);
  });

  it('retains imported endpoints when the import changes the matrix size', async () => {
    const user = userEvent.setup();
    const props = makeProps();
    const grid = new Array<number>(36).fill(0);
    grid[0] = grid[35] = 1;
    const { container } = render(<ImportEditor {...props} />);
    const file = new File([JSON.stringify({ size: 6, grid, solution: [] })],
      'board.json', { type: 'application/json' });

    await user.upload(screen.getByLabelText('Import JSON'), file);
    await waitFor(() => expect(props.onSizeChange).toHaveBeenCalledWith(6));
    await waitFor(() => expect(getCells(container)).toHaveLength(36));
    expect(getCells(container)[0].textContent).toBe('1');
    expect(getCells(container)[35].textContent).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Execute AI Solver' }));
    expect(props.onSolve).toHaveBeenCalledWith(grid);
  });

  it('rejects solving a board with an unmatched endpoint', () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const props = makeProps();
    const { container } = render(<FlowEditor {...props} />);
    fireEvent.click(getCells(container)[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Execute AI Solver' }));

    expect(alert).toHaveBeenCalledWith('Each number must have exactly two endpoints.');
    expect(props.onSolve).not.toHaveBeenCalled();
  });

  it('clears both the board and the displayed solution', () => {
    const props = makeProps();
    const { container } = render(<FlowEditor {...props} />);
    fireEvent.click(getCells(container)[0]);
    props.onClearSolution.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Matrix' }));

    expect(getCells(container).every(cell => cell.textContent === '')).toBe(true);
    expect(props.onClearSolution).toHaveBeenCalledOnce();
  });
});
