# Sudoku Visualizer

A small, dependency-free browser app that visualizes a Sudoku solving strategy one scan at a time.

## Run it

Open `index.html` in a modern browser. No build step or package installation is required.

## Current solving strategy: sequential scan

The first version models a scan-based approach:

1. Start with digit 1 and work upward through 9.
2. For the active digit, inspect each row, then each column, then each 3×3 box.
3. If one of those units has exactly one legal location for the digit, place it.
4. Restart at digit 1 after a placement, because the new number may unlock an earlier digit.
5. If a full pass makes no placement, report that this strategy is stuck.

A legal location is an empty cell whose row, column, and 3×3 box do not already contain the active digit. This version deliberately does not use pencil marks, candidate notation, or guessing/backtracking.

## Controls

- **Play / Pause**: automatically advance through the scan log.
- **Step**: advance one scan or placement.
- **←**: go back one logged step.
- **Playback speed**: change automatic playback speed.
- **Load example**: restore the included puzzle.
- **Clear board**: start with an empty grid.
- **Reset puzzle**: restore the original example.
- Click an editable cell and type 1–9 to enter a number. Backspace/Delete clears it. Conflicting entries are rejected.

Keyboard shortcuts: Space toggles playback; Left/Right arrows move through steps.

## Scope and limitations

This is an educational visualizer, not yet a complete general-purpose Sudoku solver. It only implements the scan strategy described above. Some valid puzzles require techniques beyond a single-digit hidden-single scan, so the app can correctly report that it is stuck without proving the puzzle unsolvable. The scan log is generated from the starting grid and replayed deterministically.

## Planned next steps

- More faithful controls for the exact scan order and scan-cycle behavior.
- Candidate-elimination techniques (including naked/hidden pairs and X-Wing).
- Puzzle import/export and input validation.
- Side-by-side comparison of solving strategies and statistics.
- Automated tests for puzzle validity and solver behavior.
