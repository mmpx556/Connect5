/* ---------- Connect-5 (Neon) – AI with Threat-Space Search ---------- */
/*  Red  = computer (player 1)   Blue = human (player 2)               */

⋯  /* all earlier code above is unchanged */  ⋯

/* ---------- computer move ---------- */
function computerMove () {

  /* 0. opening-book reply (only if computer’s first move & playing second) */
  if (turnNumber === 1 && currentPlayer === 1) {
    const reply = book[lastHumanMove.join(",")];
    if (reply && !board[reply[0]][reply[1]]) {
      makeMove(reply[0], reply[1], 1);
      return;
    }
  }

  /* 1. Threat-space search: 10 half-moves, 500 ms budget */
  const tMove = tssDFS(10, 500);
  if (tMove) { makeMove(tMove[0], tMove[1], 1); return; }

  /* 2. Adaptive α-β fallback */
  const depth = (turnNumber < 4 && currentPlayer === 1) ? 4 : 3;
  ⋯         /* minimax loop unchanged */                ⋯
}

/* --------- Threat-Space Search with time limit --------- */
function tssDFS(maxDepth, timeLimit = 500) {          // timeLimit in ms
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
    if (performance.now() > deadline) return false;       // ⌛ time-out
    if (depth === 0) return false;

    const myThreats = player === 1 ? threats : [];
    for (const [tr, tc] of myThreats) {
      if (performance.now() > deadline) return false;     // extra check
      if (board[tr][tc]) continue;
      board[tr][tc] = player;

      if (checkWin(tr, tc, false)) { board[tr][tc] = 0; return [tr, tc]; }

      const blocks = player === 1 ? criticalBlocks(tr, tc) : [[tr, tc]];
      let forcedLose = true;

      for (const [br, bc] of blocks) {
        if (performance.now() > deadline) { board[tr][tc] = 0; return false; }
        if (board[br][bc]) continue;

        board[br][bc] = 3 - player;          // opponent reply
        const res = dfs(depth - 1, player);  // same player threatens again
        board[br][bc] = 0;

        if (res) { board[tr][tc] = 0; return res; } // winning line found
        forcedLose = false;                         // opponent has defence
      }
      board[tr][tc] = 0;
      if (forcedLose) return [tr, tc];              // all replies fail for opp.
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
        const idx = m.index + 1;
        const [br, bc] = coords[idx - 4];
        if (inBounds(br, bc) && board[br][bc] === 0) cells.push([br, bc]);
      }
    }
    board[r][c] = 0;
    return cells.length ? cells : [[r, c]];
  }

  return dfs(maxDepth, 1);       // computer (player 1) to move
}

/* ---------- startup ---------- */
showModeSelector();
