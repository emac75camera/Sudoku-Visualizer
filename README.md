# Sudoku Visualizer

**Version 1.4** is a dependency-free browser app for watching a Sudoku strategy calculate its next scan in real time. It is designed around a particular sequential scanning method rather than a conventional all-purpose Sudoku solver.

## Run it as a website

This is a static website. It needs no server, build process, package installation, or backend.

To publish it with GitHub Pages:

1. Open the repository's **Settings** tab.
2. Select **Pages** in the sidebar.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**, then save.
5. Wait for GitHub Pages to publish the site. The Pages panel will show its public URL.

You can also open `index.html` directly in a modern browser.

## Version 1.4 features

- Interactive 9×9 Sudoku board with manual cell entry.
- Import a puzzle by pasting an 81-character string. Use digits 1–9 for filled cells and `0` or `.` for blanks. Whitespace, commas, semicolons, and vertical bars are ignored.
- Basic input validation rejects duplicate digits in a row, column, or 3×3 box.
- Optional candidate overlay shows legal digits for each empty cell. It is **display-only** and does not influence solver decisions.
- Live scan processing: the next unit is examined only when the user presses Step or the playback timer advances.
- Cell-by-cell reasoning: every inspected cell is marked as still possible or eliminated.
- Explicit elimination explanations identify the row, column, and/or 3×3 box that rules out a cell.
- Unit conclusions explain whether zero, multiple, or exactly one legal position remains.
- A forced hidden single is shown as a separate deduction before the number is placed.
- A running event count, scan count, placement count, and filled-cell count. There is deliberately no total-step estimate because future processing has not happened yet.
- Previous-step navigation backed by recorded state snapshots.
- Clear stopping states for completion, scan-method dead ends, and detected contradictions.

## The solving method

The visualizer follows this sequence:

1. Start with digit 1.
2. For that digit, inspect all nine rows in order.
3. Inspect all nine columns in order.
4. Inspect all nine 3×3 boxes in order.
5. In each unit, identify empty cells where the active digit is legal. A legal cell must not already have that digit in its row, column, or box.
6. If a unit has exactly one legal location, place the digit there immediately and restart the entire process at digit 1.
7. If no placement is found, continue to the next unit and then the next digit.
8. If all 243 unit checks (9 digits × 3 unit types × 9 units) are completed without a placement, report **Scan method stuck**.

This is a single-digit hidden-single scan. It does not use pencil marks, candidate notation, pairs, X-Wing, guessing, or backtracking to decide placements. The candidate overlay is a separate visual aid only.

## Live processing and event history

Version 1.2 built a complete array of scan and placement events before playback began. The interface then replayed that precomputed list. That made the animation look live, but the solving work had already happened and the total event count was known in advance.

Version 1.3 changed that architecture. Version 1.4 adds cell-by-cell explanations:

- The solver stores its current board and scan position: active digit, unit type, and unit number.
- A Step action evaluates exactly the next cell in the current unit, or presents the unit conclusion once all nine cells have been inspected.
- It records and displays the cell decision immediately. No later cell is evaluated until the next Step or timer tick.
- If a placement is found, the board changes immediately and the scan cursor resets to row 1 of the *same digit*. The solver advances to the next digit only after checking all rows, columns, and boxes for the current digit without finding another placement.
- If the scan reaches the end of digit 9 without a placement, it stops and reports that this particular method is stuck.
- The event history stores state snapshots so Previous can restore the exact earlier board and scan position. New processing after going backward replaces the abandoned future history.
- The counter is labelled **Processed events** and counts events that have actually occurred. It does not display a total or predicted number of future steps.

A unit with exactly one legal cell first produces a deduction event explaining why that cell is the only remaining possibility. The following event places the digit. Units with zero or multiple legal cells produce a conclusion explaining why no placement can be made.

## Understanding the stopping messages

These outcomes are intentionally different:

- **Puzzle complete**: all 81 cells are filled by the scan method.
- **Scan method stuck**: a complete pass over digits 1–9 found no unit with exactly one legal location. This does *not* prove that the puzzle has no solution. The puzzle may need a different Sudoku technique.
- **Contradiction detected**: at least one digit still needs to be placed, but no empty cell can legally contain it. The current board cannot be completed under Sudoku rules. This is stronger than merely being stuck.
- **Import validation error**: the starting puzzle contains a duplicate in a row, column, or box. This check does not prove that an otherwise valid-looking puzzle has a solution or a unique solution.

The app currently does not run a separate complete solver to prove solvability or count solutions.

## Controls

- **Play / Pause**: automatically calculate and display successive scans.
- **Step**: calculate exactly one next unit check or placement.
- **←**: restore the previous recorded event and board state.
- **Playback speed**: change the delay between automatic processing events.
- **Load example**: load the included example puzzle.
- **Clear board**: start with an empty grid.
- **Reset puzzle**: restore the original example.
- Click an editable cell and type 1–9 to enter a number. Backspace/Delete clears it. Conflicting entries are rejected.
- **Show candidates**: toggle legal candidate digits on empty cells. This is a visual aid only.
- **Import 81-cell puzzle**: paste a compact puzzle string and import it after duplicate validation.

Keyboard shortcuts: Space toggles playback; Left/Right arrows move through events.

## Roadmap and implementation ideas

The roadmap is a set of ideas, not a promise that every item will be implemented. The guiding principle is to preserve the original scan method as a distinct, understandable algorithm. New features should be optional layers or separate solver modes rather than silently changing what the base mode does.

### 1. Stronger puzzle verification

**Goal:** Tell the difference between a puzzle that the scan method cannot finish and a puzzle that has no valid solution.

Suggested approach:
- Keep the live scan solver independent.
- Add a separate verification module that uses backtracking or constraint propagation to search for a valid completion.
- Run verification on demand or after import, not as a hidden replacement for the visible scan process.
- Count solutions up to two: zero means no solution, one means unique solution, and two means multiple solutions (the search can stop once it finds the second).
- Present verification separately from the scan status. For example, “Scan method stuck; verifier found one solution” is more accurate than calling the puzzle unsolvable.

This would also allow an optional “Show verified solution” feature without pretending that the scan method found those placements.

### 2. Additional solving techniques as separate modes

Potential sequence:
1. Naked singles: a cell has only one legal candidate.
2. Hidden singles: a digit has only one legal location in a row, column, or box. This is the current method.
3. Naked and hidden pairs/triples: candidate sets constrain multiple cells or digits.
4. Pointing pairs and box-line reductions: candidates in a box or line eliminate possibilities elsewhere.
5. X-Wing and other advanced patterns.

Suggested approach:
- Implement each technique as a separate function that reports its reasoning and proposed action.
- Give each technique its own mode or selectable strategy profile.
- Keep candidate calculations in a shared utility layer, but do not let the display-only candidate overlay alter the current scan mode.
- Make each deduction explainable: show the cells involved, the candidate(s) affected, and why the elimination or placement is valid.
- Add tests for each technique using small known examples before integrating it into playback.

### 3. Screenshot and photograph recognition

**Goal:** Load a puzzle from a photo instead of manually typing an 81-character string.

Suggested approach:
- Add image upload and a crop/straighten step.
- Detect the 9×9 grid and recognize each cell with OCR or a digit classifier.
- Show the recognized grid in an editable confirmation screen.
- Require the user to correct and confirm uncertain cells before the puzzle is loaded.
- Run the existing duplicate validation after confirmation.

Recognition should never silently feed uncertain digits into the solver. A correction screen is essential because a single misread clue can make a valid puzzle appear contradictory.

### 4. More detailed scan visualization

Ideas:
- Show the current digit and unit scan cursor more prominently.
- Distinguish “zero legal locations,” “multiple legal locations,” and “one forced location” visually.
- Add an optional scan-cycle summary after all 243 checks have been completed without a placement.
- Allow the user to choose whether rows, columns, or boxes are scanned first, while keeping the default order documented.
- Add a pause-on-placement setting and a slower single-cell inspection mode.

### 5. Strategy comparison and learning tools

Ideas:
- Let users run the same puzzle with different strategies and compare placements, scans, and time.
- Explain why the base scan method gets stuck while another technique can continue.
- Add a technique glossary with short examples.
- Provide a replayable deduction log that can be exported as text or JSON.
- Track how many deductions each technique contributes, without presenting those statistics as a measure of puzzle difficulty by themselves.

### 6. Testing and code quality

Recommended engineering steps:
- Add known test puzzles for immediate completion, scan-method completion, scan-method stuck, invalid duplicate input, and contradiction detection.
- Test that every Step advances exactly one unit check or one placement event.
- Test that no future scans are calculated before the user advances.
- Test that Previous restores the exact board, digit, unit type, and unit number.
- Test that a placement resets the scan cursor to digit 1, row 1.
- Test the verifier separately from the visible scan solver.
- Consider moving solver logic into a standalone module so it can be tested without a browser UI.

## Project structure

- `index.html`: page structure and controls.
- `styles.css`: responsive visual design and live scan indicator.
- `app.js`: board interaction, puzzle validation, live scan state machine, event history, and candidate display.
- `README.md`: current behavior, algorithm explanation, implementation notes, and roadmap.


## Version 1.4 reasoning model

The solver now separates a unit scan into individual cell inspections. For each cell, it records whether the active digit is legal and every applicable reason it is eliminated: the cell is occupied, its row contains the active digit, its column contains the active digit, or its 3×3 box contains the active digit. The board marks inspected cells, remaining legal positions, and the current cell. Once all nine cells in a unit have been inspected, a separate conclusion event explains the result. If exactly one legal location remains, the solver presents a hidden-single deduction; the following event places the digit. Event snapshots include the inspection trace so Previous restores the explanation as well as the board.

This is the first teaching layer, not yet a complete human-style Sudoku solver. It explains the existing single-digit hidden-single scan.
