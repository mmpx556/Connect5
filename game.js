/* --------- Threat-Space Search with time limit --------- */
function tssDFS(maxDepth, timeLimit = 500) {          // timeLimit in ms
  const deadline = performance.now() + timeLimit;

  /* Step 1: gather all moves that give Red an open-4 after one stone */
  const threats = [];
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) {
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

  /* depth-limited DFS that respects the deadline */
  function dfs(depth, player) {
    if (performance.now() > deadline) return false;   // time-out
    if (depth === 0) return false;

    const myThreats = player === 1 ? threats : [];
    for (const [tr, tc] of myThreats) {
      if (performance.now() > deadline) return false; // extra check
      if (board[tr][tc]) continue;

      board[tr][tc] = player;
      if (checkWin(tr, tc, false)) { board[tr][tc] = 0; return [tr, tc]; }

      const blocks = player === 1 ? criticalBlocks(tr, tc) : [[tr, tc]];
      let allFail = true;

      for (const [br, bc] of blocks) {
        if (performance.now() > deadline) { board[tr][tc] = 0; return false; }
        if (board[br][bc]) continue;

        board[br][bc] = 3 - player;          // opponent reply
        const res = dfs(depth - 1, player);  // same player threatens again
        board[br][bc] = 0;

        if (res) { board[tr][tc] = 0; return res; }
        allFail = false;                     // opponent found a defence
      }
      board[tr][tc] = 0;
      if (allFail) return [tr, tc];          // all replies fail -> winning line
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

  return dfs(maxDepth, 1);                     // Red (computer) to move
}
