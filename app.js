(() => {
  "use strict";

  const EXAMPLE = [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
  ];

  const boardEl = document.getElementById("board");
  const $ = id => document.getElementById(id);
  let puzzle = clone(EXAMPLE);
  let board = clone(EXAMPLE);
  let given = EXAMPLE.map(row => row.map(n => n !== 0));
  let steps = [];
  let stepIndex = 0;
  let selectedCell = null;
  let timer = null;
  let speed = 1;
  let showCandidates = false;

  function clone(grid) { return grid.map(row => row.slice()); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function countFilled(grid) { return grid.flat().filter(Boolean).length; }
  function candidatesFor(grid, r, c) { return [1,2,3,4,5,6,7,8,9].filter(n => legal(grid,r,c,n)); }
  function unitName(type, n) {
    return type === "row" ? `row ${n + 1}` : type === "column" ? `column ${n + 1}` : `box ${Math.floor(n / 3) * 3 + 1}–${Math.floor(n / 3) * 3 + 3}`;
  }
  function boxIndex(r, c) { return Math.floor(r / 3) * 3 + Math.floor(c / 3); }
  function legal(grid, r, c, digit) {
    if (grid[r][c] !== 0) return false;
    for (let i = 0; i < 9; i++) {
      if (grid[r][i] === digit || grid[i][c] === digit) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) if (grid[rr][cc] === digit) return false;
    return true;
  }
  function cellsFor(type, n) {
    if (type === "row") return Array.from({length:9}, (_,c) => [n,c]);
    if (type === "column") return Array.from({length:9}, (_,r) => [r,n]);
    const br = Math.floor(n / 3) * 3, bc = (n % 3) * 3;
    const cells = [];
    for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) cells.push([r,c]);
    return cells;
  }
  function snapshot(kind, digit, type, unit, candidates, message, placement) {
    return {kind, digit, type, unit, candidates: candidates.map(([r,c]) => [r,c]), message, placement: placement || null};
  }
  function buildSteps(start) {
    const work = clone(start), result = [];
    let filled = countFilled(work), scans = 0, placements = 0, loops = 0;
    const max = 5000;
    result.push(snapshot("intro", 1, null, null, [], "Starting at digit 1. For each digit, inspect rows, columns, and 3×3 boxes for a unit with exactly one legal location."));
    while (filled < 81 && result.length < max && loops++ < 100) {
      let madeProgress = false;
      for (let digit = 1; digit <= 9 && !madeProgress; digit++) {
        const types = ["row", "column", "box"];
        for (const type of types) {
          for (let unit = 0; unit < 9; unit++) {
            const open = cellsFor(type, unit).filter(([r,c]) => legal(work, r, c, digit));
            scans++;
            if (open.length === 1) {
              const [r,c] = open[0];
              result.push(snapshot("scan", digit, type, unit, open, `Scanning digit ${digit}: ${unitName(type,unit)} has exactly one legal spot, at row ${r+1}, column ${c+1}. This placement is forced by that unit.`));
              work[r][c] = digit; filled++; placements++;
              result.push(snapshot("place", digit, type, unit, [[r,c]], `Place ${digit} at row ${r+1}, column ${c+1}. Restart the scan at digit 1 because the new number may unlock earlier digits.`, [r,c]));
              madeProgress = true;
              break;
            }
            if (open.length > 0) {
              result.push(snapshot("scan", digit, type, unit, open, `Digit ${digit}: checking ${unitName(type,unit)}. There are ${open.length} legal locations, so this unit does not force a placement yet.`));
            }
          }
          if (madeProgress) break;
        }
      }
      if (!madeProgress) {
        result.push(snapshot("stuck", 1, null, null, [], "No digit has a uniquely determined location in any row, column, or box. This scan-only method is stuck here. A later version can add candidate elimination and more advanced techniques."));
        break;
      }
    }
    if (filled === 81) result.push(snapshot("complete", 9, null, null, [], `Puzzle complete. The scan method made ${placements} placements after ${scans} unit checks.`));
    return result;
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    $("playIcon").textContent = "▶";
    $("playText").textContent = "Play";
  }
  function currentStep() { return steps[Math.max(0, Math.min(stepIndex, steps.length - 1))]; }
  function render() {
    const s = currentStep();
    board = clone(puzzle);
    let placements = 0, scans = 0;
    for (let i = 0; i <= stepIndex; i++) {
      if (steps[i].kind === "place" && steps[i].placement) {
        const [r,c] = steps[i].placement;
        board[r][c] = steps[i].digit;
        placements++;
      }
      if (steps[i].kind === "scan") scans++;
    }
    boardEl.innerHTML = "";
    const focusSet = new Set((s.candidates || []).map(([r,c]) => r * 9 + c));
    const related = new Set();
    if (s.type && s.unit !== null) for (const [r,c] of cellsFor(s.type,s.unit)) related.add(r*9+c);
    for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
      const idx=r*9+c, cell=document.createElement("button");
      cell.type="button"; cell.className="cell"; cell.setAttribute("role","gridcell");
      cell.setAttribute("aria-label",`Row ${r+1}, column ${c+1}, ${board[r][c] || "empty"}`);
      if (given[r][c]) cell.classList.add("given");
      else if (board[r][c]) cell.classList.add("solved");
      if (related.has(idx)) cell.classList.add("related");
      if (focusSet.has(idx)) cell.classList.add("candidate");
      if (s.placement && s.placement[0]===r && s.placement[1]===c) cell.classList.add("focus");
      if (selectedCell && selectedCell[0]===r && selectedCell[1]===c) cell.classList.add("selected");
      if (board[r][c]) {
        cell.innerHTML = '<span class="cell-value">' + board[r][c] + '</span>';
      } else if (showCandidates) {
        const nums = candidatesFor(board,r,c);
        cell.innerHTML = '<span class="candidate-grid">' + [1,2,3,4,5,6,7,8,9].map(n => '<span>' + (nums.includes(n)?n:'') + '</span>').join('') + '</span>';
        cell.setAttribute("aria-label", 'Row ' + (r+1) + ', column ' + (c+1) + ', empty, candidates ' + (nums.join(", ") || "none"));
      } else {
        cell.textContent = "";
      }
      cell.addEventListener("click",()=>{selectedCell=[r,c];render();});
      boardEl.appendChild(cell);
    }
    $("focusNumber").textContent = s.digit || "—";
    $("focusTitle").textContent = ({intro:"Ready to scan",scan:"Checking a unit",place:"Placement found",stuck:"Scan method stuck",complete:"Puzzle complete"})[s.kind] || "Scanning";
    $("focusDescription").textContent = s.kind==="intro" ? "Press Play or Step to begin checking where this digit can go." : s.kind==="complete" ? "Every cell is filled using the scan-based method." : s.kind==="stuck" ? "The current strategy needs another solving technique." : s.kind==="place" ? "A unique legal location was found." : "Inspecting one row, column, or box for the active digit.";
    $("scanUnit").textContent = s.type ? unitName(s.type,s.unit) : (s.kind==="complete" ? "All 81 cells filled" : s.kind==="stuck" ? "No forced placement" : "Starting scan");
    $("stepCount").textContent = `Step ${stepIndex} / ${Math.max(0,steps.length-1)}`;
    $("scanProgress").style.width = `${steps.length>1 ? stepIndex/(steps.length-1)*100 : 0}%`;
    $("reasoning").textContent = s.message;
    $("placements").textContent = placements;
    $("scans").textContent = scans;
    $("filled").textContent = countFilled(board);
    $("backBtn").disabled = stepIndex===0;
    $("stepBtn").disabled = stepIndex>=steps.length-1;
    $("playBtn").disabled = stepIndex>=steps.length-1;
  }
  function rebuild() { stop(); steps=buildSteps(puzzle); stepIndex=0; render(); }
  function next() { if(stepIndex<steps.length-1){stepIndex++;render();} if(stepIndex>=steps.length-1)stop(); }
  function play() {
    if(timer){stop();return;}
    if(stepIndex>=steps.length-1) stepIndex=0;
    $("playIcon").textContent="Ⅱ"; $("playText").textContent="Pause";
    timer=setInterval(next, Math.round(1250/ speed));
  }
  function validPuzzle(grid) {
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(grid[r][c]){
      const n=grid[r][c]; grid[r][c]=0;
      const ok=!grid[r].includes(n) && !grid.some(row=>row[c]===n) && !cellsFor("box",boxIndex(r,c)).some(([rr,cc])=>grid[rr][cc]===n);
      grid[r][c]=n; if(!ok)return false;
    }
    return true;
  }
  function loadGrid(grid) {
    puzzle=clone(grid); given=grid.map(row=>row.map(n=>n!==0)); selectedCell=null; rebuild();
  }
  function editSelected(key) {
    if(!selectedCell)return;
    const [r,c]=selectedCell;
    if(given[r][c])return;
    const value=/^[1-9]$/.test(key)?Number(key):0;
    const candidate=clone(puzzle); candidate[r][c]=value;
    if(!validPuzzle(candidate)){ $("reasoning").textContent="That entry conflicts with a number already in its row, column, or 3×3 box."; return; }
    puzzle=candidate; rebuild();
  }

  $("candidateToggle").addEventListener("change",e=>{showCandidates=e.target.checked;render();});
  $("importBtn").addEventListener("click",()=>{
    const raw=$("puzzleString").value.trim();
    const compact=raw.replace(/[\\s|,;]+/g,"");
    const status=$("importStatus");
    if(!/^[0-9.]{81}$/.test(compact)){
      status.textContent="Expected exactly 81 digits, dots, or zeros. Found "+compact.length+" characters.";
      status.className="import-status error";
      return;
    }
    const grid=Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>{
      const ch=compact[r*9+c]; return ch==="."||ch==="0"?0:Number(ch);
    }));
    if(!validPuzzle(clone(grid))){
      status.textContent="This puzzle has a duplicate in a row, column, or 3×3 box.";
      status.className="import-status error";
      return;
    }
    loadGrid(grid);
    status.textContent="Puzzle imported successfully.";
    status.className="import-status success";
  });
  $("sampleBtn").addEventListener("click",()=>loadGrid(EXAMPLE));
  $("clearBtn").addEventListener("click",()=>loadGrid(Array.from({length:9},()=>Array(9).fill(0))));
  $("resetBtn").addEventListener("click",()=>{puzzle=clone(EXAMPLE);given=EXAMPLE.map(row=>row.map(n=>n!==0));selectedCell=null;rebuild();});
  $("playBtn").addEventListener("click",play);
  $("stepBtn").addEventListener("click",()=>{stop();next();});
  $("backBtn").addEventListener("click",()=>{stop();stepIndex=Math.max(0,stepIndex-1);render();});
  $("speed").addEventListener("input",e=>{speed=Number(e.target.value);$("speedValue").textContent=`${speed}×`;if(timer){stop();play();}});
  document.addEventListener("keydown",e=>{
    if(e.target.matches("input,textarea"))return;
    if(selectedCell && (/^[1-9]$/.test(e.key)||e.key==="Backspace"||e.key==="Delete")){e.preventDefault();editSelected(e.key);}
    if(e.key==="ArrowRight"){stop();next();}
    if(e.key==="ArrowLeft"){stop();stepIndex=Math.max(0,stepIndex-1);render();}
    if(e.key===" "){e.preventDefault();play();}
  });
  rebuild();
})();