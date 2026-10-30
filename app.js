(() => {
  "use strict";

  const EXAMPLE = [
    [5,3,0,0,7,0,0,0,0], [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0], [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1], [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0], [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
  ];
  const boardEl = document.getElementById("board");
  const $ = id => document.getElementById(id);
  const TYPES = ["row", "column", "box"];
  let puzzle = clone(EXAMPLE), given = EXAMPLE.map(row => row.map(n => n !== 0));
  let selectedCell = null, timer = null, speed = 1, showCandidates = false;
  let state, history = [], stepIndex = 0;

  function clone(grid) { return grid.map(row => row.slice()); }
  function cloneState(s) { return {...s, grid:clone(s.grid)}; }
  function countFilled(grid) { return grid.flat().filter(Boolean).length; }
  function boxIndex(r,c) { return Math.floor(r/3)*3+Math.floor(c/3); }
  function unitName(type,n) {
    return type === "row" ? `row ${n+1}` : type === "column" ? `column ${n+1}` : `box ${Math.floor(n/3)*3+1}–${Math.floor(n/3)*3+3}`;
  }
  function cellsFor(type,n) {
    if(type==="row") return Array.from({length:9},(_,c)=>[n,c]);
    if(type==="column") return Array.from({length:9},(_,r)=>[r,n]);
    const br=Math.floor(n/3)*3,bc=(n%3)*3,cells=[];
    for(let r=br;r<br+3;r++) for(let c=bc;c<bc+3;c++) cells.push([r,c]);
    return cells;
  }
  function legal(grid,r,c,digit) {
    if(grid[r][c]!==0) return false;
    for(let i=0;i<9;i++) if(grid[r][i]===digit||grid[i][c]===digit) return false;
    const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
    for(let rr=br;rr<br+3;rr++) for(let cc=bc;cc<bc+3;cc++) if(grid[rr][cc]===digit) return false;
    return true;
  }
  function candidatesFor(grid,r,c) { return [1,2,3,4,5,6,7,8,9].filter(n=>legal(grid,r,c,n)); }
  function validPuzzle(grid) {
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(grid[r][c]) {
      const n=grid[r][c]; grid[r][c]=0;
      const ok=!grid[r].includes(n)&&!grid.some(row=>row[c]===n)&&!cellsFor("box",boxIndex(r,c)).some(([rr,cc])=>grid[rr][cc]===n);
      grid[r][c]=n; if(!ok)return false;
    }
    return true;
  }
  function initialState(grid) {
    return {grid:clone(grid),digit:1,typeIndex:0,unit:0,scans:0,placements:0,filled:countFilled(grid),status:"ready",event:{
      kind:"intro",digit:1,type:null,unit:null,candidates:[],placement:null,
      message:"Ready. Each scan will now be calculated only when you advance. The solver starts with digit 1."
    }};
  }
  function saveState() { history=history.slice(0,stepIndex+1); history.push(cloneState(state)); stepIndex=history.length-1; }
  function finish(kind,message) {
    state.status=kind;
    state.event={kind,digit:state.digit,type:null,unit:null,candidates:[],placement:null,message};
  }
  function advance() {
    if(state.status==="complete"||state.status==="stuck"||state.status==="contradiction") return false;
    if(state.filled===81) { finish("complete",`Puzzle complete. The live scan made ${state.placements} placements after ${state.scans} unit checks.`); saveState(); return true; }

    const digit=state.digit,type=TYPES[state.typeIndex],unit=state.unit;
    const open=cellsFor(type,unit).filter(([r,c])=>legal(state.grid,r,c,digit));
    state.scans++;
    const unitLabel=unitName(type,unit);

    if(open.length===1) {
      const [r,c]=open[0];
      state.grid[r][c]=digit; state.filled++; state.placements++;
      state.digit=digit; state.typeIndex=0; state.unit=0;
      state.event={kind:"place",digit,type,unit,candidates:open,placement:[r,c],
        message:`Live scan: ${unitLabel} has exactly one legal location for ${digit}. Place ${digit} at row ${r+1}, column ${c+1}. Restart the scan for digit ${digit}; move to the next digit only after this digit has no more forced placements.`};
    } else {
      state.event={kind:"scan",digit,type,unit,candidates:open,placement:null,
        message:`Checked digit ${digit} in ${unitLabel}: ${open.length} legal ${open.length===1?"location":"locations"}. ${open.length===0?"This unit has no available location for this digit.":"No placement is forced by this unit."}`};
      state.unit++;
      if(state.unit===9) { state.unit=0; state.typeIndex++; }
      if(state.typeIndex===3) {
        state.typeIndex=0; state.digit++;
        if(state.digit===10) {
          const missing=[];
          for(let d=1;d<=9;d++) {
            const present=state.grid.flat().filter(v=>v===d).length;
            if(present<9 && !state.grid.some((row,r)=>row.some((v,c)=>v===0&&legal(state.grid,r,c,d)))) missing.push(d);
          }
          if(missing.length) { state.digit=9; finish("contradiction",`Contradiction detected: digit${missing.length>1?"s":""} ${missing.join(", ")} still need placement(s), but no empty cell can legally contain ${missing.length>1?"them":"it"}. The current board cannot be completed under Sudoku rules.`); }
          else { state.digit=9; finish("stuck","A complete pass through digits 1–9 found no forced placement. The scan method is stuck, but this alone does not prove the puzzle is unsolvable."); }
        }
      }
    }
    saveState();
    return true;
  }
  function stop() {
    if(timer) clearInterval(timer);
    timer=null; $("playIcon").textContent="▶"; $("playText").textContent="Play";
  }
  function render() {
    const s=state.event,grid=state.grid;
    boardEl.innerHTML="";
    const focusSet=new Set((s.candidates||[]).map(([r,c])=>r*9+c)),related=new Set();
    if(s.type&&s.unit!==null) for(const [r,c] of cellsFor(s.type,s.unit)) related.add(r*9+c);
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
      const idx=r*9+c,cell=document.createElement("button");
      cell.type="button";cell.className="cell";cell.setAttribute("role","gridcell");
      cell.setAttribute("aria-label",`Row ${r+1}, column ${c+1}, ${grid[r][c]||"empty"}`);
      if(given[r][c])cell.classList.add("given");else if(grid[r][c])cell.classList.add("solved");
      if(related.has(idx))cell.classList.add("related");
      if(focusSet.has(idx))cell.classList.add("candidate");
      if(s.placement&&s.placement[0]===r&&s.placement[1]===c)cell.classList.add("focus");
      if(selectedCell&&selectedCell[0]===r&&selectedCell[1]===c)cell.classList.add("selected");
      if(grid[r][c]) cell.innerHTML='<span class="cell-value">'+grid[r][c]+'</span>';
      else if(showCandidates) {
        const nums=candidatesFor(grid,r,c);
        cell.innerHTML='<span class="candidate-grid">'+[1,2,3,4,5,6,7,8,9].map(n=>'<span>'+(nums.includes(n)?n:"")+'</span>').join("")+'</span>';
        cell.setAttribute("aria-label",`Row ${r+1}, column ${c+1}, empty, candidates ${nums.join(", ")||"none"}`);
      }
      cell.addEventListener("click",()=>{selectedCell=[r,c];render();});
      boardEl.appendChild(cell);
    }
    $("focusNumber").textContent=s.digit||"—";
    $("focusTitle").textContent=({intro:"Ready to scan",scan:"Checking a unit",place:"Placement found",stuck:"Scan method stuck",contradiction:"Contradiction detected",complete:"Puzzle complete"})[s.kind]||"Scanning";
    $("focusDescription").textContent=({intro:"Press Play or Step to begin live processing.",scan:"One unit was just checked. The next check has not been calculated yet.",place:"A unique legal location was found and placed.",stuck:"No forced placement was found in a complete pass.",contradiction:"The current board contains a digit with no legal destination.",complete:"Every cell is filled."})[s.kind]||"";
    $("scanUnit").textContent=s.type?unitName(s.type,s.unit):({complete:"All 81 cells filled",stuck:"No forced placement",contradiction:"Invalid completion path",intro:"Waiting for first scan"})[s.kind]||"";
    $("stepCount").textContent=`Processed events: ${stepIndex}`;
    $("reasoning").textContent=s.message;
    $("placements").textContent=state.placements;
    $("scans").textContent=state.scans;
    $("filled").textContent=state.filled;
    $("backBtn").disabled=stepIndex===0;
    const finished=["complete","stuck","contradiction"].includes(state.status);
    $("stepBtn").disabled=finished;
    $("playBtn").disabled=finished;
  }
  function rebuild() { stop();state=initialState(puzzle);history=[cloneState(state)];stepIndex=0;render(); }
  function next() { if(advance())render(); if(["complete","stuck","contradiction"].includes(state.status))stop(); }
  function previous() {
    if(stepIndex>0) { stepIndex--;state=cloneState(history[stepIndex]);render(); }
  }
  function play() {
    if(timer){stop();return;}
    if(["complete","stuck","contradiction"].includes(state.status))return;
    $("playIcon").textContent="Ⅱ";$("playText").textContent="Pause";
    timer=setInterval(next,Math.round(1250/speed));
  }
  function loadGrid(grid) { puzzle=clone(grid);given=grid.map(row=>row.map(n=>n!==0));selectedCell=null;rebuild(); }
  function editSelected(key) {
    if(!selectedCell)return;
    const [r,c]=selectedCell;if(given[r][c])return;
    const value=/^[1-9]$/.test(key)?Number(key):0,candidate=clone(puzzle);candidate[r][c]=value;
    if(!validPuzzle(candidate)){$("reasoning").textContent="That entry conflicts with a number already in its row, column, or 3×3 box.";return;}
    loadGrid(candidate);
  }

  $("candidateToggle").addEventListener("change",e=>{showCandidates=e.target.checked;render();});
  $("importBtn").addEventListener("click",()=>{
    const compact=$("puzzleString").value.trim().replace(/[\s,;|]+/g,""),status=$("importStatus");
    if(!/^[0-9.]{81}$/.test(compact)){status.textContent="Expected exactly 81 digits, dots, or zeros. Found "+compact.length+" characters.";status.className="import-status error";return;}
    const grid=Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>{const ch=compact[r*9+c];return ch==="."||ch==="0"?0:Number(ch);}));
    if(!validPuzzle(clone(grid))){status.textContent="This puzzle has a duplicate in a row, column, or 3×3 box.";status.className="import-status error";return;}
    loadGrid(grid);status.textContent="Puzzle imported successfully.";status.className="import-status success";
  });
  $("sampleBtn").addEventListener("click",()=>loadGrid(EXAMPLE));
  $("clearBtn").addEventListener("click",()=>loadGrid(Array.from({length:9},()=>Array(9).fill(0))));
  $("resetBtn").addEventListener("click",()=>loadGrid(EXAMPLE));
  $("playBtn").addEventListener("click",play);
  $("stepBtn").addEventListener("click",()=>{stop();next();});
  $("backBtn").addEventListener("click",()=>{stop();previous();});
  $("speed").addEventListener("input",e=>{speed=Number(e.target.value);$("speedValue").textContent=`${speed}×`;if(timer){stop();play();}});
  document.addEventListener("keydown",e=>{
    if(e.target.matches("input,textarea"))return;
    if(selectedCell&&(/^[1-9]$/.test(e.key)||e.key==="Backspace"||e.key==="Delete")){e.preventDefault();editSelected(e.key);}
    if(e.key==="ArrowRight"){stop();next();}
    if(e.key==="ArrowLeft"){stop();previous();}
    if(e.key===" "){e.preventDefault();play();}
  });
  rebuild();
})();