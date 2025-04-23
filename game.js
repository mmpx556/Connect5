/* ---------- Connect-5 (Neon) – AI with Threat-Space Search ---------- */
/*  Red  = computer (player 1)   Blue = human (player 2)               */

const grid = document.getElementById("grid");
const scoreboard = document.getElementById("scoreboard");
const modeOverlay = document.getElementById("modeOverlay");
const messageContainer = document.getElementById("messageContainer");

let board, cells, currentPlayer, gameOver, mode, startingPlayer = 1;
let scores = [0, 0];
let turnNumber = 0;
let lastHumanMove = [4, 4];     // updated whenever blue moves
const classes = ["red", "blue"];

/* ----- tiny  opening book (computer’s first reply when playing second) ---- */
const book = {
  "4,4":[4,5], "5,5":[4,5],
  "4,5":[5,5], "5,4":[5,5],
  "0,0":[4,4],"0,9":[4,4],"9,0":[4,4],"9,9":[4,4],
  "0,4":[4,4],"9,4":[4,4],"4,0":[4,4],"4,9":[4,4]
};

/* ---------- UI helpers ---------- */
function showModeSelector(){ modeOverlay.style.display = "flex"; }
function updateScoreboard(){ scoreboard.textContent = `Red: ${scores[0]} | Blue: ${scores[1]}`; }
function showFloatingMessage(t){
  const d=document.createElement("div");
  d.className="floating-message"; d.textContent=t;
  messageContainer.appendChild(d); setTimeout(()=>d.remove(),1000);
}

/* ---------- board helpers ---------- */
const inBounds = (r,c)=> r>=0 && r<10 && c>=0 && c<10;
function isBoardEmpty(){ for(let r=0;r<10;r++)for(let c=0;c<10;c++)if(board[r][c])return false; return true;}
function isNearMove(r,c){
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++) if(board[r+i]?.[c+j]) return true;
  return false;
}
function diagonals(mat){
  const d=[],N=mat.length;
  for(let p=0;p<2*N-1;p++){
    let d1=[],d2=[];
    for(let i=0;i<=p;i++){
      const j=p-i;
      if(inBounds(i,j)){ d1.push(mat[i][j]); d2.push(mat[j][i]); }
    }
    d.push(d1,d2);
  }
  return d;
}

/* ---------- game init ---------- */
function resetGame(){
  board=Array.from({length:10},()=>Array(10).fill(0));
  currentPlayer=startingPlayer; startingPlayer=3-startingPlayer;
  gameOver=false; grid.innerHTML=""; cells=[]; turnNumber=0;
  for(let r=0;r<10;r++){ cells[r]=[];
    for(let c=0;c<10;c++){
      const cell=document.createElement("div"); cell.className="cell"; grid.appendChild(cell);
      cells[r][c]=cell;
      cell.addEventListener("click",()=>{
        if(gameOver||board[r][c])return;
        if(mode==="computer"&&currentPlayer===1)return;
        makeMove(r,c,currentPlayer);
      });
    }
  }
  updateScoreboard();
  showFloatingMessage(`${classes[currentPlayer-1][0].toUpperCase()+classes[currentPlayer-1].slice(1)} starts!`);
  if(mode==="computer"&&currentPlayer===1) setTimeout(()=>makeMove(4,4,1),300);
}
function startGame(m){ mode=m; scores=[0,0]; modeOverlay.style.display="none"; resetGame(); }

/* ---------- make move & win check ---------- */
function makeMove(r,c,player){
  board[r][c]=player; cells[r][c].classList.add(classes[player-1]);
  if(player===2) lastHumanMove=[r,c];
  turnNumber++;
  if(checkWin(r,c,true)){ gameOver=true; scores[player-1]++; updateScoreboard();
    setTimeout(()=>alert(`${classes[player-1][0].toUpperCase()+classes[player-1].slice(1)} wins!`),100); return;}
  currentPlayer=3-player;
  if(mode==="computer"&&currentPlayer===1&&!gameOver) setTimeout(computerMove,200);
}
function checkWin(r,c,hi=false){
  const p=board[r][c],dirs=[[1,0],[0,1],[1,1],[1,-1]];
  for(const[dr,dc]of dirs){
    let count=1, winCells=[[r,c]];
    for(const s of[-1,1]){
      let nr=r+dr*s, nc=c+dc*s;
      while(board[nr]?.[nc]===p){count++;winCells.push([nr,nc]); nr+=dr*s; nc+=dc*s;}
    }
    if(count>=5){ if(hi) winCells.forEach(([rr,cc])=>cells[rr][cc].classList.add("highlight")); return true;}
  } return false;
}

/* ---------- fast pattern evaluator ---------- */
function evalLine(str,pm,om){
  if(str.includes(pm.repeat(5))) return 100000;
  if(str.includes(om.repeat(5))) return -100000;
  const pad=` ${str} `;
  if(pad.includes(` ${pm.repeat(4)} `)) return 8000;
  if(pad.includes(` ${om.repeat(4)} `)) return -9000;
  if(/XX_X|X_XX/.test(str.replaceAll(pm,'X'))) return pm==='X'?5000:-7000;
  if(str.includes(pm.repeat(3))) return 200;
  if(str.includes(om.repeat(3))) return -250;
  if(str.includes(pm.repeat(2))) return 30;
  if(str.includes(om.repeat(2))) return -35;
  return 0;
}
function evaluate(){
  let total=0;
  const rows=[...board,
              ...board[0].map((_,c)=>board.map(r=>r[c])),
              ...diagonals(board),
              ...diagonals(board.map(r=>[...r].reverse()))];
  for(const line of rows){
    total+=evalLine(line.map(v=>v===1?'X':v===2?'O':' ').join(''),'X','O');
  }
  return total;
}

/* ---------- mini α-β (fallback) ---------- */
function minimax(depth,maxP,a,b){
  const val=evaluate();
  if(Math.abs(val)>=90000||depth===0) return val;
  if(maxP){
    let best=-Infinity;
    for(let r=0;r<10;r++)for(let c=0;c<10;c++){
      if(board[r][c]||!isNearMove(r,c))continue;
      board[r][c]=1; best=Math.max(best,minimax(depth-1,false,a,b)); board[r][c]=0;
      if(best>=b) return best; a=Math.max(a,best);
    } return best;
  }else{
    let best=Infinity;
    for(let r=0;r<10;r++)for(let c=0;c<10;c++){
      if(board[r][c]||!isNearMove(r,c))continue;
      board[r][c]=2; best=Math.min(best,minimax(depth-1,true,a,b)); board[r][c]=0;
      if(best<=a) return best; b=Math.min(b,best);
    } return best;
  }
}

/* ---------- Threat detection utilities ---------- */
function openFourMoves(player){
  const moves=[];
  const scanLines=[...board,
    ...board[0].map((_,c)=>board.map(r=>r[c])),
    ...diagonals(board),
    ...diagonals(board.map(r=>[...r].reverse()))
  ];
  scanLines.forEach((line,idx)=>{
    for(let i=0;i<=line.length-5;i++){
      const window=line.slice(i,i+5);
      const count=window.filter(x=>x===player).length;
      if(count===4 && window.includes(0)){
        const pos=line===board[idx]? [idx,i+window.indexOf(0)] : null; // quick only for rows
      }
    }
  });
  return moves;
}

/* --------- simple Threat-Space Search (depth-limited DFS) --------- */
function tssDFS(maxDepth){
  /* Generate threat list: each item = {r,c} that creates open4 for player1 */
  const threats=[];
  const dirs=[[1,0],[0,1],[1,1],[1,-1]];
  for(let r=0;r<10;r++)for(let c=0;c<10;c++){
    if(board[r][c])continue;
    board[r][c]=1;
    // does this move create open 4?
    for(const[dr,dc]of dirs){
      let line="";
      for(let k=-4;k<=4;k++){
        const nr=r+k*dr,nc=c+k*dc;
        line+= board[nr]?.[nc]===1?'X': board[nr]?.[nc]===2?'O':' ';
      }
      if(/ XXXX /.test(line)){ threats.push([r,c]); break; }
    }
    board[r][c]=0;
  }
  /* DFS */
  function dfs(depth,player){
    if(depth===0) return false;
    if(player===1){        // computer’s turn → try a threat
      for(const [tr,tc] of threats){
        if(board[tr][tc]) continue;
        board[tr][tc]=1;
        if(checkWin(tr,tc,false)){ board[tr][tc]=0; return [tr,tc]; }
        const oppBlocks = criticalBlocks(tr,tc,2);
        let allFail=true;
        for(const [br,bc] of oppBlocks){
          board[br][bc]=2;
          const res=dfs(depth-1,1);
          board[br][bc]=0;
          if(res){ allFail=false; break; }
        }
        board[tr][tc]=0;
        if(!allFail) return [tr,tc];
      }
    }
    return false;
  }
  /* For a given threat move, return opponent’s forced blocks (1 or 2 cells) */
  function criticalBlocks(r,c,opp){
    const blocks=[];
    board[r][c]=1;
    const dirs=[[1,0],[0,1],[1,1],[1,-1]];
    for(const[dr,dc]of dirs){
      let seq="";
      const coords=[];
      for(let k=-4;k<=4;k++){
        const nr=r+k*dr,nc=c+k*dc; coords.push([nr,nc]);
        seq+= board[nr]?.[nc]===1?'X': board[nr]?.[nc]===2?'O':' ';
      }
      const m=seq.match(/ XXXX /);
      if(m){
        const idx=m.index+1;   // empty spot index in seq
        const [br,bc]=coords[idx-4]; // convert back to board coords
        if(inBounds(br,bc)&&board[br][bc]===0) blocks.push([br,bc]);
      }
    }
    board[r][c]=0;
    return blocks.length?blocks:[[r,c]]; // fallback: at least block the move itself
  }
  return dfs(maxDepth,1);
}

/* ---------- computer move ---------- */
function computerMove(){
  /* 0. opening-book reply (only if computer’s first move & playing second) */
  if(turnNumber===1 && currentPlayer===1){
    const reply=book[lastHumanMove.join(",")];
    if(reply && !board[reply[0]][reply[1]]){ makeMove(reply[0],reply[1],1); return;}
  }

  /* 1. Threat-space search up to 10 plies */
  const tMove=tssDFS(10);
  if(tMove){ makeMove(tMove[0],tMove[1],1); return; }

  /* 2. adaptive α-β fallback */
  const depth=(turnNumber<4&&currentPlayer===1)?4:3;
  let bestVal=-Infinity,bestMove=null;
  for(let r=0;r<10;r++)for(let c=0;c<10;c++){
    if(board[r][c]||!isNearMove(r,c)) continue;
    board[r][c]=1;
    if(checkWin(r,c,false)){ board[r][c]=0; makeMove(r,c,1); return; }
    board[r][c]=2;
    if(checkWin(r,c,false)){ board[r][c]=0; makeMove(r,c,1); return; }
    board[r][c]=1;
    const v=minimax(depth-1,false,-Infinity,Infinity);
    board[r][c]=0;
    if(v>bestVal){bestVal=v; bestMove=[r,c];}
  }
  if(bestMove) makeMove(bestMove[0],bestMove[1],1);
}
/* --------- Threat-Space Search with time limit --------- */
function tssDFS(maxDepth, timeLimit = 500) {        // timeLimit in ms
  const deadline = performance.now() + timeLimit;

  /* 1. collect all current computer threats (open-4 after one move) */
  const threats = [];
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    if (board[r][c]) continue;
    board[r][c] = 1;
    outer: for (const [dr, dc] of dirs) {
      let line = "";
      for (let k = -4; k <= 4; k++) {
        const nr = r + k * dr, nc = c + k * dc;
        line += board[nr]?.[nc] === 1 ? "X" : board[nr]?.[nc] === 2 ? "O" : " ";
      }
      if (/ XXXX /.test(line)) { threats.push([r, c]); break outer; }
    }
    board[r][c] = 0;
  }

  function dfs(depth, player) {
    if (performance.now() > deadline) return false;           // ⌛ time-out
    if (depth === 0) return false;

    const myThreats = player === 1 ? threats : [];            // only computer creates threats
    for (const [tr, tc] of myThreats) {
      if (board[tr][tc]) continue;
      board[tr][tc] = player;
      if (checkWin(tr, tc, false)) { board[tr][tc] = 0; return [tr, tc]; }

      const blocks = player === 1 ? criticalBlocks(tr, tc) : [[tr, tc]];
      let forcedLose = true;
      for (const [br, bc] of blocks) {
        if (board[br][bc]) continue;
        board[br][bc] = 3 - player;                 // opponent reply
        const res = dfs(depth - 1, player);         // same player threatens again
        board[br][bc] = 0;
        if (res) { board[tr][tc] = 0; return res; } // winning sequence found
        forcedLose = false;                         // opponent has a defense
      }
      board[tr][tc] = 0;
      if (forcedLose) return [tr, tc];              // all replies fail for opponent
    }
    return false;
  }

  function criticalBlocks(r, c) {
    const cells = [];
    board[r][c] = 1;
    for (const [dr, dc] of dirs) {
      let line = "", coords = [];
      for (let k = -4; k <= 4; k++) {
        const nr = r + k * dr, nc = c + k * dc; coords.push([nr, nc]);
        line += board[nr]?.[nc] === 1 ? "X" : board[nr]?.[nc] === 2 ? "O" : " ";
      }
      const m = line.match(/ XXXX /);
      if (m) {
        const idx = m.index + 1;                    // empty spot in “ XXXX ”
        const [br, bc] = coords[idx - 4];
        if (inBounds(br, bc) && board[br][bc] === 0) cells.push([br, bc]);
      }
    }
    board[r][c] = 0;
    return cells.length ? cells : [[r, c]];
  }

  return dfs(maxDepth, 1);   // computer (player 1) to move
}

/* ---------- startup ---------- */
showModeSelector();
