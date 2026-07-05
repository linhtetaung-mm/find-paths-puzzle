// import React, { useState } from 'react';
// import FlowGame from './FlowGame';
// import FlowEditor from './FlowEditor';
// import { VisualFlowSolver } from './FlowSolverEngine';


// const FlowSolverPage = () => {
//   const [solverState, setSolverState] = useState<number[][]>([]);
//   const [isSolving, setIsSolving] = useState(false);
//   const [status, setStatus] = useState("Ready for Analysis");

//   const runAISolver = async (userGrid: number[]) => {
//     setIsSolving(true);
//     setStatus("Analyzing Search Space...");
    
//     const engine = new VisualFlowSolver(
//       boardSize, 
//       userGrid, 
//       (currentPaths) => setSolverState(currentPaths) // Update visual lines
//     );

//     const success = await engine.solve();
    
//     setIsSolving(false);
//     setStatus(success ? "Solution Verified" : "No Valid Solution Found");
//   };

//   return (
//     <div className="bg-slate-950 p-10">
//       {/* status display */}
//       <div className={`text-xs mb-4 uppercase tracking-widest ${isSolving ? 'text-yellow-500 animate-pulse' : 'text-blue-500'}`}>
//         System Status: {status}
//       </div>

//       {/* The Board (from previous step) */}
//       <div className="relative">
//         <FlowEditor size={boardSize} onSolve={runAISolver} />
        
//         {/* The SVG Layer showing the AI's current attempt */}
//         <svg className="absolute inset-0 pointer-events-none">
//           {solverState.map((path, i) => (
//              <PolyLine key={i} cells={path} size={boardSize} color={PATH_COLORS[i+1]} isActive={isSolving} />
//           ))}
//         </svg>
//       </div>
//     </div>
//   );
// };