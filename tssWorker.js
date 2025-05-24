// tssWorker.js
self.onmessage = (e) => {
  const { board, maxDepth, timeLimit } = e.data;
  const N = 10;

  // utilities: inBounds, isNearMove, diagonals, checkWin, criticalBlocks, etc.
  // (copy them from your main file, omitting DOM calls)

  function inBounds(r,c){ return r>=0 && r< N && c>=0 && c< N; }
  function isNearMove(r,c){ for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)if(board[r+i]?.[c+j])return true; return false; }
  function diagonals(mat){ /* same as game.js */ }
  function checkWin(r,c){ /* same logic, without highlight */ }
  function criticalBlocks(r,c){ /* same as game.js */ }

  // Threat-Space Search
  function tssDFS(maxDepth, timeLimit) {
    const deadline = performance.now() + timeLimit;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    const threats = [];

    // collect open-4 threats
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){
      if(board[r][c]) continue;
      board[r][c] = 1;
      outer: for(const [dr,dc] of dirs){
        let line = '';
        for(let k=-4;k<=4;k++){
          const nr=r+k*dr, nc=c+k*dc;
          line += board[nr]?.[nc]===1?'X':board[nr]?.[nc]===2?'O':' ';
        }
        if(/ XXXX /.test(line)){ threats.push([r,c]); break outer; }
      }
      board[r][c] = 0;
    }

    function dfs(depth, player){
      if(performance.now() > deadline) return false;
      if(depth===0) return false;
      const myThreats = player===1 ? threats : [];
      for(const [tr,tc] of myThreats){
        if(performance.now() > deadline) return false;
        if(board[tr][tc]) continue;
        board[tr][tc] = player;
        if(checkWin(tr,tc)){ board[tr][tc]=0; return [tr,tc]; }
        const blocks = player===1 ? criticalBlocks(tr,tc) : [[tr,tc]];
        let allFail = true;
        for(const [br,bc] of blocks){
          if(performance.now() > deadline){ board[tr][tc]=0; return false; }
          if(board[br][bc]) continue;
          board[br][bc] = 3-player;
          const res = dfs(depth-1, player);
          board[br][bc] = 0;
          if(res){ board[tr][tc]=0; return res; }
          allFail = false;
        }
        board[tr][tc] = 0;
        if(allFail) return [tr,tc];
      }
      return false;
    }
    return dfs(maxDepth,1);
  }

  const move = tssDFS(maxDepth, timeLimit);
  self.postMessage(move);
};
