import { VisualFlowSolver } from './FlowSolverEngine';

self.onmessage = (e: MessageEvent) => {
  const { size, grid } = e.data;
  const startTime = performance.now();
  
  // Initialize the engine and pass a callback for progress updates
  const engine = new VisualFlowSolver(size, grid, (steps) => {
    // Send a heartbeat back to the UI so we know it hasn't frozen
    self.postMessage({ type: 'progress', steps });
  });

  // Start the heavy calculation
  const solution = engine.solve();
  const duration = performance.now() - startTime;
  
  // Calculation finished. Send the final result and STOP progress updates.
  self.postMessage({ type: 'result', solution, duration });
};