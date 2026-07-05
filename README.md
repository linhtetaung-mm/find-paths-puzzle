# 🗺️ Find Multiple Paths (Flow Puzzle Engine & AI Solver)

A high-performance, mobile-responsive web implementation of the classic **Flow Connect** puzzle game. This project features an interactive layout that includes an active gameplay interface alongside a dedicated background-threaded **AI Solver Lab**.

Built using modern web standards: **React**, **TypeScript**, **Tailwind CSS v4**, and **Vite**.

---

## 🚀 Architectural & Design Features

*   **🎮 Mission Mode (`FlowGame`)**: Play through handcrafted level configurations across multiple layout formats.
*   **🤖 AI Solver Lab (`FlowEditor`)**: An interactive matrix editor panel where you can sketch, input custom layout blocks, and witness an automated solver unravel solutions in real-time.
*   **⚡ Web Worker Integration (`flowsolver.worker.ts`)**: Heavy algorithmic pathfinding computations run isolated inside a background browser thread (`type: 'module'`). This prevents UI freeze-ups and maintains 60 FPS layout fluidity even on large matrices.
*   **📱 Universal Touch Optimization**: Engineered for fluid responsive scaling. Features horizontal swipe-snapping size panels, mobile-optimized metric components, and custom gesture overrides to separate game dragging from page scrolling.
*   **💾 State-Preserving Tab Layout**: Employs smart styling toggles (`hidden`) instead of component unmounting. Users can jump back and forth between an active game session and the solver studio without losing structural state data, puzzle drawings, or compute statistics.

---

## 🛠️ Technology Stack

*   **Core Engine**: Vite + React + TypeScript Configuration
*   **State Management**: Optimized React Architecture (Hardwired Hooks & Message-Passing Listeners)
*   **Styling System**: Tailwind CSS v4 (Leveraging responsive flex mechanics, native CSS modules, and custom viewport overrides)
*   **Thread Concurrency**: Native HTML5 Web Workers (`Worker` API)

---

## 💻 Local Workspace Initialization

Follow these quick commands to install, link, and spin up the code sandbox on your local developer workstation:

### 1. Clone the Codebase
```bash
git clone https://github.com
cd YOUR_REPO_NAME
```

### 2. Install Project Modules
This project relies on strict dependency tracking via `pnpm` to save local disk storage space:
```bash
pnpm install
```

### 3. Spin Up the Development Sandbox
Launch the Vite hot-module-replacement server node:
```bash
pnpm dev
```
Open your preferred desktop or mobile browser viewport and steer it to the active console terminal address output (usually `http://localhost:5173`).

---

## 📦 Bundling & Deployment Execution

To compile, minify, and compress your puzzle game workspace codebase into a highly-optimized static collection ready for free web hosting nodes (like GitHub Pages, Netlify, or Vercel), execute:

```bash
pnpm build
```
The asset builder will write static production files directly into a self-contained root folder named `/dist`.

---

## 🤝 Open Contributions & Refactoring
The solver core leverages backtracking algorithms designed for grid-based link detection. Feel free to clone, refactor, and introduce custom heuristics to accelerate matrix state exploration times!

## 📄 License
This application setup is completely open-source and free to share, modify, or adapt for your own game mechanics. Enjoy codebreaking!
