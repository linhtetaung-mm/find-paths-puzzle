# Technical Analysis: Recursive Backtracking Flow Solver

**Project:** Flow Puzzle Solver Engine  
**Architect:** Lin Htet Aung  
**Language:** TypeScript / React / Web Worker

---

# 1. The Core Concept (Flow Path Finding)

The Flow puzzle is a **Constraint Satisfaction Problem (CSP)** in which every pair of colored endpoints must be connected by a continuous path while satisfying a set of strict rules. The objective is not only to connect matching colors, but also to ensure that every square on the board is occupied without allowing paths to overlap.

The solver enforces the following constraints:

- Each color must connect exactly one pair of endpoints.
- Paths may only move horizontally or vertically.
- Paths cannot overlap or intersect.
- Every grid cell must be occupied.
- Each color forms a single continuous path.

Unlike shortest-path problems, Flow requires all colors to coexist on the same board. A path that appears optimal for one color may block another color entirely. Therefore, solving the puzzle requires considering the entire board rather than individual paths.

Instead of using traditional graph search algorithms, the engine models the puzzle as a recursive search problem using **Depth-First Search (DFS) with Recursive Backtracking**.

---

# 2. Why Recursive Backtracking?

The Flow puzzle has an extremely large search space.

Every empty square introduces multiple possible movement directions, and each decision affects every remaining color. Trying every possible board configuration directly would quickly become computationally impossible.

Recursive backtracking solves this problem by exploring only one possibility at a time.

The algorithm follows this process:

1. Select the current color.
2. Extend the current path by one neighboring cell.
3. Verify that the move is still valid.
4. Continue recursively.
5. If the board becomes impossible to solve, undo the move.
6. Explore another direction.

This approach allows the solver to systematically search every valid configuration while immediately abandoning impossible branches.

---

# 3. Search Tree Exploration

The recursive search can be visualized as a decision tree.

```
Start

├── Move Up
│      ├── Move Left
│      ├── Move Right
│      └── Dead End ❌
│
├── Move Down
│      ├── Continue
│      └── Solution ✅
│
├── Move Left
│      └── Dead End ❌
│
└── Move Right
```

Every branch represents one possible extension of the current path.

Whenever a branch violates the puzzle rules, recursion immediately returns to the previous state and explores another branch.

This "try → validate → undo" mechanism forms the foundation of the solver.

---

# 4. Neighbor Exploration

The solver only allows movement to orthogonally adjacent cells.

The `getNeighbors()` function calculates the valid neighboring positions by checking the four possible directions:

- Up
- Down
- Left
- Right

Diagonal movement is intentionally excluded because it violates the Flow puzzle rules.

Restricting movement to four directions simplifies the search while preserving puzzle correctness.

---

# 5. Constraint Validation

Every candidate move is validated before recursion continues.

The engine verifies several important conditions.

## Empty Cell Validation

The next square must either be:

- an empty cell, or
- the destination endpoint of the current color.

Occupied cells belonging to other colors cannot be entered.

---

## Goal Detection

If the neighboring square is the destination endpoint, the current path is considered complete.

The solver then switches to solving the next color instead of continuing the current one.

---

## Minimum Path Length

The implementation prevents paths from immediately connecting adjacent endpoints.

```ts
if (currentPath.length < 2) continue;
```

This guarantees that every completed path has meaningful length and avoids trivial solutions.

---

# 6. Dead-End Pruning

The largest optimization used in the solver is **Dead-End Pruning**.

Without pruning, recursive search wastes a large amount of time exploring branches that can never produce a valid solution.

Before moving into an empty square, the solver calls:

```ts
isDeadEnd(next)
```

The function examines neighboring empty cells.

For each neighboring cell, it counts how many remaining exits are available.

If any cell would become trapped with fewer than two accessible neighbors, the move is rejected immediately.

Example:

```
□ □ □
□ X □
□ ■ □
```

If placing the path on **■** isolates **X**, then **X** can never become part of a complete path.

Instead of exploring thousands of unnecessary recursive calls, the branch is discarded immediately.

This optimization dramatically reduces the search space.

---

# 7. Recursive State Management

The solver maintains a working copy of the puzzle board.

Every recursive step follows the same sequence.

```
Mark current position

↓

Extend current path

↓

Recursive search

↓

Failure?

↓

Undo move

↓

Try another direction
```

If recursion fails to find a solution, the board state is restored exactly as it was before the move.

This guarantees that each recursive branch begins from a valid puzzle configuration.

---

# 8. Multiple Color Handling

Unlike single-path algorithms, the solver must connect several independent colors.

The constructor scans the board and stores every endpoint inside a map.

```ts
Map<Color, Endpoint[]>
```

Example:

```
Red   → [2, 41]

Blue  → [5, 30]

Green → [7, 44]
```

Each color is solved individually.

Once one color reaches its destination endpoint, recursion proceeds to the next color.

This sequential strategy greatly simplifies the overall search.

---

# 9. Board Completion Verification

Connecting every color is not sufficient.

A valid Flow puzzle also requires that every grid cell be occupied.

The solver performs a final validation using:

```ts
grid.every(cell => cell !== 0)
```

Only boards containing no empty squares are accepted as valid solutions.

This guarantees compliance with the official Flow puzzle rules.

---

# 10. Web Worker Architecture

Recursive search may require millions of recursive calls.

Executing such calculations directly inside React would freeze the browser interface.

To avoid this issue, the solver executes inside a dedicated **Web Worker**.

Execution flow:

```
FlowEditor

↓

postMessage()

↓

FlowSolverWorker

↓

VisualFlowSolver

↓

Recursive Backtracking

↓

Solution

↓

postMessage()

↓

FlowEditor
```

Because the computation runs on a separate thread, the React interface remains fully responsive throughout the solving process.

---

# 11. Progress Reporting

Long recursive searches can take several seconds.

To provide visual feedback, the solver periodically reports its progress.

Every 5,000 recursive calls:

```ts
if (stepCount % 5000 === 0)
```

the worker sends a progress message back to the user interface.

This allows the application to display:

- Current recursive steps
- Solver activity
- Execution progress

without interrupting the solving process.

---

# 12. Performance Analysis

Several design decisions improve the overall performance of the solver.

### Working Board Copy

Instead of modifying the original puzzle board, the constructor creates a separate working copy.

```ts
this.grid = [...grid];
```

This allows recursion to freely modify the board while preserving the original puzzle.

---

### Endpoint Lookup

Endpoints are stored inside a `Map`.

```
Color

↓

Endpoints
```

This provides efficient lookup during recursion.

---

### Local Neighbor Evaluation

Dead-end detection only analyzes nearby cells.

Instead of scanning the entire board after every move, only neighboring cells are examined.

This keeps pruning operations lightweight while providing significant reductions in recursive exploration.

---

# 13. Algorithm Complexity

| Operation | Complexity |
|-----------|------------|
| Neighbor lookup | O(1) |
| Dead-end detection | O(1) (local neighborhood) |
| Endpoint lookup | O(1) |
| Recursive search | O(4^d) worst case |
| Memory usage | O(d) recursion depth |

Although the worst-case complexity is exponential, dead-end pruning eliminates a large number of impossible branches in practical puzzles.

---

# 14. Why This Algorithm?

Several algorithms were considered conceptually.

| Algorithm | Reason Not Used |
|------------|----------------|
| Breadth-First Search (BFS) | Explores too many board states and consumes large amounts of memory. |
| Dijkstra's Algorithm | Designed for shortest-path optimization rather than satisfying multiple simultaneous constraints. |
| A* Search | Requires an effective heuristic, which is difficult because every path depends on all remaining paths. |
| Greedy Search | Frequently blocks future paths, resulting in unsolvable boards. |
| Recursive Backtracking (Chosen) | Naturally explores all valid possibilities while allowing continuous constraint validation and pruning. |

Recursive backtracking provides the best balance between correctness, simplicity, and flexibility for solving Flow puzzles.

---

# 15. Conclusion

The Flow Puzzle Solver is built around a **recursive backtracking algorithm enhanced with constraint-based pruning**.

Rather than generating every possible board configuration, the engine incrementally constructs paths, validates each move against the puzzle constraints, and immediately abandons impossible branches through dead-end detection.

The use of recursive depth-first exploration, efficient endpoint management, local pruning techniques, and asynchronous execution inside a Web Worker enables the solver to efficiently search complex solution spaces while maintaining a responsive React user interface.

This architecture provides a practical and maintainable solution for solving Flow-style puzzles, balancing algorithmic correctness, computational efficiency, and user experience.