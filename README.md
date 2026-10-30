# Sudoku Visualizer

**Version 1.2** is a dependency-free browser app that visualizes a Sudoku solving strategy one scan at a time.

## Run it as a website

This is a static website: it needs no server, build process, package installation, or backend.

To publish it with GitHub Pages:

1. Open the repository's **Settings** tab.
2. Select **Pages** in the sidebar.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**, then save.
5. Wait for GitHub Pages to publish the site. The Pages panel will show its public URL.

You can also open `index.html` directly in a modern browser.

## Version 1.2 features

- Interactive 9×9 Sudoku board with manual cell entry.
- Import a puzzle by pasting an 81-character string. Use digits 1–9 for filled cells and `0` or `.` for blanks. Whitespace, commas, semicolons, and vertical bars are ignored.
- Basic puzzle validation rejects duplicate digits in a row, column, or 3×3 box.
- Optional candidate overlay shows the legal digits for each empty cell.
- Candidate calculation is **display-only**. It does not influence the sequential scan solver or its placement decisions.
- Playback controls, step history, scan explanations, and placement/scan counters.

## Current solving strategy: sequential scan

1. Start with digit 1 and work upward through 9.
2. For the active digit, inspect each row, then each column, then each 3×3 box.
3. If one of those units has exactly one legal location for the digit, place it.
4. Restart at digit 1 after a placement, because the new number may unlock an earlier digit.
5. If a full pass makes no placement, report that this strategy is stuck.

A legal location is an empty cell whose row, column, and 3×3 box do not already contain the active digit. The solver deliberately does not use pencil marks, candidate notation, or guessing/backtracking.

## Controls

- **Play / Pause**: automatically advance through the scan log.
- **Step**: advance one scan or placement.
- **←**: go back one logged step.
- **Playback speed**: change automatic playback speed.
- **Load example**: restore the included puzzle.
- **Clear board**: start with an empty grid.
- **Reset puzzle**: restore the original example.
- Click an editable cell and type 1–9 to enter a number. Backspace/Delete clears it. Conflicting entries are rejected.
- **Show candidates**: toggle legal candidate digits on empty cells. This is a visual aid only.
- **Import 81-cell puzzle**: paste a compact puzzle string and import it after validation.

Keyboard shortcuts: Space toggles playback; Left/Right arrows move through steps.

## Scope and next steps

This is an educational visualizer, not yet a complete general-purpose Sudoku solver. Some valid puzzles require techniques beyond a single-digit hidden-single scan, so the app can report that it is stuck without proving the puzzle unsolvable.

Planned future work:
- Screenshot/photo recognition with a correction-and-confirmation step before import.
- More faithful controls for the exact scan order and scan-cycle behavior.
- Candidate-elimination techniques (including naked/hidden pairs and X-Wing) as separate solver modes.
- Side-by-side comparison of solving strategies and statistics.
- Automated tests for puzzle validity and solver behavior.

## Project structure

- `index.html`: page structure and controls.
- `styles.css`: responsive visual design.
- `app.js`: board interaction, puzzle validation, candidate display, and scan solver.
