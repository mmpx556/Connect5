// game.js
const grid = document.getElementById("grid");
const scoreboard = document.getElementById("scoreboard");
const modeOverlay = document.getElementById("modeOverlay");
const messageContainer = document.getElementById("messageContainer");

let board, cells, currentPlayer, gameOver, mode, startingPlayer = 1;
let scores = [0, 0];
let turnNumber = 0;
let lastHumanMove = [4, 4];
const classes = ["red", "blue"];

// opening book
const book = {
  "4,4": [4,5], "5,5": [4,5],
  "4,5": [5,5], "5,4": [5,5],
  "0,0": [4,4], "0,9": [4,4],
  "9,0": [4,4], "9,9": [4,4],
  "0,4": [4,4], "9,4": [4,4],
  "4,0": [4,4], "4,9": [4,4]
};

// UI helpers
function showModeSelector() {
  modeOverlay.style.display = "flex";
}
function updateScoreboard() {
  scoreboard.textContent = `Red: ${scores[0]} | Blue: ${scores[1]}`;
}
function showFloatingMessage(text) {
  const d = document.createElement("div");
  d.className = "floating-message";
  d.textContent = text;
  messageContainer.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

// Board utilities
const inBounds = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 10;
function isNearMove(r, c) {
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++)
      if (board[r + i]?.[c + j]) return true;
  return false;
}
function diagonals(mat) {
  const d = [], N = mat.length;
  for (let p = 0; p < 2 * N - 1; p++) {
    let d1 = [], d2 = [];
    for (let i = 0; i <= p; i++) {
      const j = p - i;
      if (inBounds(i, j)) {
        d1.push(mat[i][j]);
        d2.push(mat[j][i]);
      }
    }
    d.push(d1, d2);
  }
  return d;
}

// Initialize game
function resetGame() {
  board = Array.from({ length: 10 }, () => Array(10).fill(0));
  currentPlayer = startingPlayer;
  startingPlayer = 3 - startingPlayer;
  gameOver = false;
  grid.innerHTML = "";
  cells = [];
  turnNumber = 0;

  for (let r = 0; r < 10; r++) {
    cells[r] = [];
    for (let c = 0; c < 10; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      grid.appendChild(cell);
      cells[r][c] = cell;
      cell.addEventListener("click", () => {
        if (gameOver || board[r][c]) return;
        if (mode === "computer" && currentPlayer === 1) return;
        makeMove(r, c, currentPlayer);
      });
    }
  }

  updateScoreboard();
  showFloatingMessage(
    `${classes[currentPlayer - 1][0].toUpperCase() + classes[currentPlayer - 1].slice(1)} starts!`
  );
  if (mode === "computer" && currentPlayer === 1) setTimeout(() => runComputer(), 200);
}
function startGame(m) {
  mode = m;
  scores = [0, 0];
  modeOverlay.style.display = "none";
  resetGame();
}

// Player moves
function makeMove(r, c, player) {
  board[r][c] = player;
  cells[r][c].classList.add(classes[player - 1]);
  if (player === 2) lastHumanMove = [r, c];
  turnNumber++;

  if (checkWin(r, c, true)) {
    gameOver = true;
    scores[player - 1]++;
    updateScoreboard();
    setTimeout(
      () => alert(
        `${classes[player - 1][0].toUpperCase() + classes[player - 1].slice(1)} wins!`
      ),
      100
    );
    return;
  }
  currentPlayer = 3 - player;
  if (mode === "computer" && currentPlayer === 1 && !gameOver)
    setTimeout(() => runComputer(), 200);
}
function checkWin(r, c, highlight = false) {
  const p = board[r][c];
  const dirs = [ [1, 0], [0, 1], [1, 1], [1, -1] ];
  for (const [dr, dc] of dirs) {
    let count = 1,
      cellsA = [[r, c]];
    for (const s of [-1, 1]) {
      let nr = r + dr * s,
        nc = c + dc * s;
      while (inBounds(nr, nc) && board[nr][nc] === p) {
        count++;
        cellsA.push([nr, nc]);
        nr += dr * s;
        nc += dc * s;
      }
    }
    if (count >= 5) {
      if (highlight)
        cellsA.forEach(([rr, cc]) =>
          cells[rr][cc].classList.add("highlight")
        );
      return true;
    }
  }
  return false;
}

// Offload Threat-Space Search to Web Worker
const aiWorker = new Worker("tssWorker.js");
let workerCallback;
aiWorker.onmessage = (e) => {
  const move = e.data;
  if (move && workerCallback) workerCallback(move);
};

function runComputer() {
  // opening book reply
  if (turnNumber === 1) {
    const rep = book[lastHumanMove.join(",")];
    if (rep && !board[rep[0]][rep[1]]) {
      makeMove(rep[0], rep[1], 1);
      return;
    }
  }
  // ask worker for best move
  const maxDepth = 12;
  workerCallback = ([r, c]) => {
    workerCallback = null;
    makeMove(r, c, 1);
  };
  aiWorker.postMessage({ board, maxDepth, timeLimit: 5000 });
}

// Fallback minimax
function minimax(depth, maxP, alpha, beta) {
  const score = evaluate();
  if (Math.abs(score) >= 90000 || depth === 0) return score;
  if (maxP) {
    let best = -Infinity;
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) {
        if (board[r][c] || !isNearMove(r, c)) continue;
        board[r][c] = 1;
        best = Math.max(
          best,
          minimax(depth - 1, false, alpha, beta)
        );
        board[r][c] = 0;
        if (best >= beta) return best;
        alpha = Math.max(alpha, best);
      }
    return best;
  } else {
    let best = Infinity;
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) {
        if (board[r][c] || !isNearMove(r, c)) continue;
        board[r][c] = 2;
        best = Math.min(
          best,
          minimax(depth - 1, true, alpha, beta)
        );
        board[r][c] = 0;
        if (best <= alpha) return best;
        beta = Math.min(beta, best);
      }
    return best;
  }
}

// Pattern scoring for evaluator
function evalLine(s, pm, om) {
  if (s.includes(pm.repeat(5))) return 100000;
  if (s.includes(om.repeat(5))) return -100000;
  const pad = ` ${s} `;
  if (pad.includes(` ${pm.repeat(4)} `)) return 8000;
  if (pad.includes(` ${om.repeat(4)} `)) return -9000;
  if (/XX_X|X_XX/.test(s.replaceAll(pm, 'X')))
    return pm === 'X' ? 5000 : -7000;
  if (s.includes(pm.repeat(3))) return 200;
  if (s.includes(om.repeat(3))) return -250;
  if (s.includes(pm.repeat(2))) return 30;
  if (s.includes(om.repeat(2))) return -35;
  return 0;
}

function evaluate() {
  let total = 0;
  const lines = [
    ...board,
    ...board[0].map((_, c) => board.map(r => r[c])),
    ...diagonals(board),
    ...diagonals(board.map(r => [...r].reverse()))
  ];
  lines.forEach((l) => {
    const s = l
      .map((v) => (v === 1 ? 'X' : v === 2 ? 'O' : ' '))
      .join('');
    total += evalLine(s, 'X', 'O');
  });
  return total;
}

// start
showModeSelector();
startGame('computer');
