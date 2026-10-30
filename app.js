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
  let selectedCell = null, timer = null, speed = 1, showCandidates = false, showScanAnimation = true;
  let state, history = [], stepIndex = 0;

  function clone(grid) { return grid.map(row => row.slice()); }
  function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
  function countFilled(grid) { return grid.flat().filter(Boolean).length; }
  function boxIndex(r,c) { return Math.floor(r/3)*3+Math.floor(c/3); }
  function unitName(type,n) {
    return type === "row" ? `row ${n+1}` : type === "column" ? `column ${n+1}` : `box ${Math.floor(n/3)+1}-${n%3+1}`;
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
    return {grid:clone(grid),digit:1,typeIndex:0,unit:0,cellIndex:0,inspected:[],legalPositions:[],liveCandidates:{},pendingPlacement:null,scans:0,placements:0,filled:countFilled(grid),status:"ready",event:{kind:"intro",digit:1,type:null,unit:null,candidates:[],inspected:[],cell:null,reasons:[],contextCells:[],sourceCells:[],placement:null,message:"Ready. The solver will inspect one cell at a time and explain each decision."}};
  }
  function saveState() { history=history.slice(0,stepIndex+1); history.push(cloneState(state)); stepIndex=history.length-1; }
  function finish(kind,message) {
    state.status=kind;
    state.event={kind,digit:state.digit,type:null,unit:null,candidates:[],placement:null,message};
  }
  function explainCell(grid,r,c,digit) {
    const value=grid[r][c];
    if(value!==0) return {legal:false,reasons:["This cell is already occupied by "+value+"."]};
    const reasons=[];
    if(grid[r].includes(digit)) reasons.push("Row "+(r+1)+" already contains "+digit+".");
    if(grid.some(row=>row[c]===digit)) reasons.push("Column "+(c+1)+" already contains "+digit+".");
    const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
    for(let rr=br;rr<br+3;rr++) for(let cc=bc;cc<bc+3;cc++) if(grid[rr][cc]===digit) reasons.push("The 3×3 box already contains "+digit+".");
    return {legal:reasons.length===0,reasons};
  }
  function resetUnitTrace(){state.cellIndex=0;state.inspected=[];state.legalPositions=[];}
  function finishCycle(){
    const missing=[];
    for(let d=1;d<=9;d++){
      let count=0,possible=false;
      for(let r=0;r<9;r++)for(let col=0;col<9;col++){
        if(state.grid[r][col]===d)count++;
        if(state.grid[r][col]===0&&legal(state.grid,r,col,d))possible=true;
      }
      if(count<9&&!possible)missing.push(d);
    }
    if(missing.length)finish("contradiction","Contradiction detected: digit(s) "+missing.join(", ")+" still need placement(s), but no empty cell can legally contain them.");
    else finish("stuck","A complete pass through digits 1–9 found no forced placement. This scan method is stuck, but the puzzle may still be solvable with another technique.");
  }
  function advanceUnit(){
    resetUnitTrace();state.unit++;
    if(state.unit===9){state.unit=0;state.typeIndex++;}
    if(state.typeIndex===3){state.typeIndex=0;state.digit++;}
    
  }
  function contextForCell(r,c,type){
    const cells=new Set();
    for(let i=0;i<9;i++){
      if(type!=="row")cells.add(r*9+i);
      if(type!=="column")cells.add(i*9+c);
    }
    const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
    if(type!=="box")for(let rr=br;rr<br+3;rr++)for(let cc=bc;cc<bc+3;cc++)cells.add(rr*9+cc);
    cells.delete(r*9+c);
    return Array.from(cells).map(i=>[Math.floor(i/9),i%9]);
  }
  function sourceCellsFor(grid,r,c,digit,reasons){
    const found=new Set();
    if(reasons.some(x=>x.startsWith("Row ")))for(let cc=0;cc<9;cc++)if(grid[r][cc]===digit)found.add(r*9+cc);
    if(reasons.some(x=>x.startsWith("Column ")))for(let rr=0;rr<9;rr++)if(grid[rr][c]===digit)found.add(rr*9+c);
    if(reasons.some(x=>x.startsWith("The 3×3 box")))for(const [rr,cc] of cellsFor("box",boxIndex(r,c)))if(grid[rr][cc]===digit)found.add(rr*9+cc);
    return Array.from(found).map(i=>[Math.floor(i/9),i%9]);
  }
  function advance(){
    if(["complete","stuck","contradiction"].includes(state.status))return false;
    if(state.pendingPlacement){
      const {r,c,digit}=state.pendingPlacement;
      state.grid[r][c]=digit;state.filled++;state.placements++;state.pendingPlacement=null;
      for(let rr=0;rr<9;rr++)for(let cc=0;cc<9;cc++)if(rr===r||cc===c||boxIndex(rr,cc)===boxIndex(r,c))delete state.liveCandidates[rr+","+cc];
      state.event={kind:"place",digit,type:null,unit:null,cell:[r,c],reasons:[],inspected:[],candidates:[],contextCells:[],sourceCells:[],placement:[r,c],message:"Place "+digit+" at row "+(r+1)+", column "+(c+1)+". Continue the remaining units in this digit's current scan cycle; do not restart the cycle."};
      saveState();return true;
    }
    if(state.filled===81){finish("complete","Puzzle complete. The solver made "+state.placements+" placements after "+state.scans+" cell inspections.");saveState();return true;}
    if(state.digit>9){finishCycle();saveState();return true;}
    const type=TYPES[state.typeIndex],unit=state.unit,label=unitName(type,unit);
    if(cellsFor(type,unit).some(([r,c])=>state.grid[r][c]===state.digit)){
      state.event={kind:"unit-skip",digit:state.digit,type,unit,cell:null,reasons:[],inspected:[],candidates:[],contextCells:[],sourceCells:[],placement:null,message:"Skip "+label+" for "+state.digit+": this unit already contains "+state.digit+", so none of its cells need to be scanned."};
      advanceUnit();saveState();return true;
    }
    if(!showScanAnimation){
      const trace=state.inspected.map(x=>({...x,reasons:x.reasons.slice()}));
      const unitCells=cellsFor(type,unit);
      for(let i=state.cellIndex;i<9;i++){
        const [r,c]=unitCells[i],result=explainCell(state.grid,r,c,state.digit);
        trace.push({r,c,legal:result.legal,reasons:result.reasons});
        state.liveCandidates[r+","+c]=state.grid[r][c]===0?candidatesFor(state.grid,r,c):[];
      }
      const options=trace.filter(x=>x.legal).map(x=>[x.r,x.c]);
      state.scans+=9-state.cellIndex;
      if(options.length===1){
        const currentDigit=state.digit;
        state.pendingPlacement={r:options[0][0],c:options[0][1],digit:state.digit,typeIndex:state.typeIndex,unit:state.unit};
        advanceUnit();
        state.event={kind:"conclusion",digit:currentDigit,type,unit,cell:null,reasons:[],inspected:trace,candidates:options,contextCells:[],sourceCells:[],placement:options[0],message:"Conclusion: after checking all nine cells in "+label+", exactly one legal location remains: row "+(options[0][0]+1)+", column "+(options[0][1]+1)+". This is a hidden single. The placement comes next, then the existing digit scan continues."};
      }else{
        state.event={kind:"unit-result",digit:state.digit,type,unit,cell:null,reasons:[],inspected:trace,candidates:options,contextCells:[],sourceCells:[],placement:null,message:"Inspect "+label+" for "+state.digit+". "+(options.length===0?"All empty cells are eliminated; no legal locations remain.":options.length+" possible locations remain. No placement can be made.")};
        advanceUnit();
      }
      saveState();return true;
    }
    if(state.cellIndex<9){
      const [r,c]=cellsFor(type,unit)[state.cellIndex],result=explainCell(state.grid,r,c,state.digit);
      const key=r+","+c;
      state.liveCandidates[key]=state.grid[r][c]===0?candidatesFor(state.grid,r,c):[];
      const item={r,c,legal:result.legal,reasons:result.reasons};
      state.inspected.push(item);if(result.legal)state.legalPositions.push([r,c]);
      state.cellIndex++;state.scans++;
      const occupied=state.grid[r][c]!==0;
      const sources=sourceCellsFor(state.grid,r,c,state.digit,result.reasons);
      const context=result.legal?contextForCell(r,c,type):[];
      let message;
      if(occupied)message="Cell row "+(r+1)+", column "+(c+1)+" is occupied by "+state.grid[r][c]+". Record the existing number and continue.";
      else if(result.legal)message="Row "+(r+1)+", column "+(c+1)+" remains a legal location for "+state.digit+". Check its intersecting row, column, and box.";
      else message="Eliminate row "+(r+1)+", column "+(c+1)+" for "+state.digit+": "+result.reasons.join(" ");
      state.event={kind:"inspect",digit:state.digit,type,unit,cell:[r,c],legal:result.legal,reasons:result.reasons,inspected:state.inspected.map(x=>({...x,reasons:x.reasons.slice()})),candidates:state.legalPositions.map(x=>x.slice()),contextCells:context,sourceCells:sources,placement:null,message};
      saveState();return true;
    }
    const options=state.legalPositions.map(x=>x.slice());
    if(options.length===1){
      const currentDigit=state.digit;
      const trace=state.inspected.map(x=>({...x,reasons:x.reasons.slice()}));
      state.pendingPlacement={r:options[0][0],c:options[0][1],digit:state.digit,typeIndex:state.typeIndex,unit:state.unit};
      advanceUnit();
      state.event={kind:"conclusion",digit:currentDigit,type,unit,cell:null,reasons:[],inspected:trace,candidates:options,contextCells:[],sourceCells:[],placement:options[0],message:"Conclusion: after checking all nine cells in "+label+", exactly one legal location remains: row "+(options[0][0]+1)+", column "+(options[0][1]+1)+". This is a hidden single. The placement comes next, then the existing digit scan continues."};
    }else{
      state.event={kind:"unit-result",digit:state.digit,type,unit,cell:null,reasons:[],inspected:state.inspected.map(x=>({...x,reasons:x.reasons.slice()})),candidates:options,contextCells:[],sourceCells:[],placement:null,message:"Finished "+label+" for "+state.digit+". "+options.length+" legal locations remain, so this unit does not force a placement."};
      advanceUnit();
    }
    saveState();return true;
  }
  function stop() {
    if(timer) clearInterval(timer);
    timer=null; $("playIcon").textContent="▶"; $("playText").textContent="Play";
  }
  function render() {
    const s=state.event,grid=state.grid;
    boardEl.innerHTML="";
    const focusSet=new Set((s.candidates||[]).map(([r,c])=>r*9+c)),related=new Set(),inspected=new Map((s.inspected||[]).map(x=>[x.r*9+x.c,x])),contextSet=new Set((s.contextCells||[]).map(([r,c])=>r*9+c)),sourceSet=new Set((s.sourceCells||[]).map(([r,c])=>r*9+c));
    if(s.type&&s.unit!==null) for(const [r,c] of cellsFor(s.type,s.unit)) related.add(r*9+c);
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
      const idx=r*9+c,cell=document.createElement("button");
      cell.type="button";cell.className="cell";cell.setAttribute("role","gridcell");
      cell.setAttribute("aria-label",`Row ${r+1}, column ${c+1}, ${grid[r][c]||"empty"}`);
      if(given[r][c])cell.classList.add("given");else if(grid[r][c])cell.classList.add("solved");
      if(related.has(idx))cell.classList.add("related");
      if(inspected.has(idx))cell.classList.add(inspected.get(idx).legal?"inspected-legal":"inspected-eliminated");
      if(showScanAnimation&&contextSet.has(idx))cell.classList.add("scan-context");
      if(focusSet.has(idx))cell.classList.add("candidate");
      if(showScanAnimation&&s.cell&&s.cell[0]===r&&s.cell[1]===c)cell.classList.add("current-cell");
      if(sourceSet.has(idx))cell.classList.add("conflict-source");
      if(s.placement&&s.placement[0]===r&&s.placement[1]===c)cell.classList.add("focus");
      if(selectedCell&&selectedCell[0]===r&&selectedCell[1]===c)cell.classList.add("selected");
      if(grid[r][c]) cell.innerHTML='<span class="cell-value">'+grid[r][c]+'</span>';
      else if(showCandidates) {
        const nums=state.liveCandidates[r+","+c]||[];
        cell.innerHTML='<span class="candidate-grid">'+[1,2,3,4,5,6,7,8,9].map(n=>'<span>'+(nums.includes(n)?n:"")+'</span>').join("")+'</span>';
        cell.setAttribute("aria-label",`Row ${r+1}, column ${c+1}, empty, candidates ${nums.join(", ")||"none"}`);
      }
      cell.addEventListener("click",()=>{selectedCell=[r,c];render();});
      boardEl.appendChild(cell);
    }
    $("focusNumber").textContent=s.digit||"—";
    $("progressText").textContent=state.filled+" / 81";
    $("progressFill").style.width=(state.filled/81*100)+"%";
    $("progressPercent").textContent=Math.round(state.filled/81*100)+"%";
    const progressBar=document.querySelector(".board-progress");
    if(progressBar)progressBar.setAttribute("aria-valuenow",String(state.filled));
    $("focusTitle").textContent=({intro:"Ready to scan",inspect:"Inspecting a cell",conclusion:"Deduction found","unit-result":"Unit checked","unit-skip":"Unit skipped","manual-edit":"Manual board edit",place:"Placement found",stuck:"Scan method stuck",contradiction:"Contradiction detected",complete:"Puzzle complete"})[s.kind]||"Scanning";
    $("focusDescription").textContent=({intro:"Press Play or Step to inspect the first cell.",inspect:"Testing this cell against its row, column, and 3×3 box.",conclusion:"All nine cells were checked. Exactly one legal location remains.","unit-result":"The unit has been fully inspected.","unit-skip":"The active digit is already present in this unit.","manual-edit":"The board changed without resetting the scan cursor.",place:"A unique legal location was found and placed.",stuck:"No forced placement was found in a complete pass.",contradiction:"The current board contains a digit with no legal destination.",complete:"Every cell is filled."})[s.kind]||"";
    $("scanUnit").textContent=s.type?unitName(s.type,s.unit):({complete:"All 81 cells filled",stuck:"No forced placement",contradiction:"Invalid completion path",intro:"Waiting for first scan"})[s.kind]||"";
    $("stepCount").textContent=`Processed events: ${stepIndex}`;
    $("reasoning").textContent=s.message;
    const details=$("reasoningDetails");details.innerHTML="";
    if(s.cell){const h=document.createElement("strong");h.textContent="Cell: row "+(s.cell[0]+1)+", column "+(s.cell[1]+1);details.appendChild(h);}
    if(s.reasons&&s.reasons.length){const ul=document.createElement("ul");s.reasons.forEach(reason=>{const li=document.createElement("li");li.textContent=reason;ul.appendChild(li);});details.appendChild(ul);}
    else if(s.kind==="inspect"){const p=document.createElement("p");p.textContent="No row, column, or box contains this digit, so this cell remains a legal possibility.";details.appendChild(p);}
    if(s.inspected&&s.inspected.length&&s.kind!=="inspect"){const p=document.createElement("p");p.textContent="Inspected "+s.inspected.length+" of 9 cells in this unit. "+s.candidates.length+" remain legal.";details.appendChild(p);}
    $("placements").textContent=state.placements;
    $("scans").textContent=state.scans;
    $("filled").textContent=state.filled;
    $("backBtn").disabled=stepIndex===0;
    const finished=["complete","stuck","contradiction"].includes(state.status);
    $("stepBtn").disabled=finished;
    $("backBtn").disabled=stepIndex===0;
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
    const value=/^[1-9]$/.test(key)?Number(key):0,candidate=clone(state.grid);candidate[r][c]=value;
    if(!validPuzzle(candidate)){$("reasoning").textContent="That entry conflicts with a number already in its row, column, or 3×3 box.";return;}
    stop();
    const wasFinished=["stuck","contradiction","complete"].includes(state.status);
    const pending=state.pendingPlacement;
    if(pending){
      const stillValid=candidate[pending.r][pending.c]===0&&legal(candidate,pending.r,pending.c,pending.digit);
      if(!stillValid){
        state.digit=pending.digit;state.typeIndex=pending.typeIndex;state.unit=pending.unit;
        resetUnitTrace();state.pendingPlacement=null;
      }
    }
    state.grid=candidate;state.filled=countFilled(candidate);
    if(!wasFinished&&!state.pendingPlacement&&state.typeIndex<3){
      state.inspected=state.inspected.map(item=>{
        const result=explainCell(state.grid,item.r,item.c,state.digit);
        return {r:item.r,c:item.c,legal:result.legal,reasons:result.reasons};
      });
      state.legalPositions=state.inspected.filter(item=>item.legal).map(item=>[item.r,item.c]);
    }
    if(wasFinished){state.digit=1;state.typeIndex=0;state.unit=0;state.cellIndex=0;state.inspected=[];state.legalPositions=[];state.pendingPlacement=null;state.status="ready";}
    for(let rr=0;rr<9;rr++)for(let cc=0;cc<9;cc++)if(rr===r||cc===c||boxIndex(rr,cc)===boxIndex(r,c))delete state.liveCandidates[rr+","+cc];
    state.event={kind:"manual-edit",digit:state.digit,type:null,unit:null,cell:[r,c],reasons:[],inspected:[],candidates:[],contextCells:[],sourceCells:[],placement:null,message:"Manual edit: "+(value?"entered "+value:"cleared")+" at row "+(r+1)+", column "+(c+1)+". The board and candidate cache were updated without resetting the active scan position."+(wasFinished?" The previous scan had stopped, so a fresh digit cycle is starting from 1.":"")};
    saveState();render();
  }

  $("candidateToggle").addEventListener("change",e=>{showCandidates=e.target.checked;render();});
  $("scanVisualToggle").addEventListener("change",e=>{showScanAnimation=e.target.checked;render();});
  for(const color of ["blue","red","green"]){
    $("color"+color[0].toUpperCase()+color.slice(1)).addEventListener("change",e=>document.body.classList.toggle("hide-"+color,!e.target.checked));
  }
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