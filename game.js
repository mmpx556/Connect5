const grid = document.getElementById("grid");
const scoreboard = document.getElementById("scoreboard");
const modeOverlay = document.getElementById("modeOverlay");
const messageContainer = document.getElementById("messageContainer");

let board, cells, currentPlayer, gameOver, mode, startingPlayer = 1;
let scores = [0, 0]; // [Red, Blue]
const classes = ["red", "blue"]; // Player 1 = Red, Player 2 = Blue

// Display the game mode selector overlay
function showModeSelector() {
  modeOverlay.style.display = "flex";
}

// Start the game in the selected mode ("human" or "computer")
function startGame(selectedMode) {
  mode = selectedMode;
  scores = [0, 0];
  modeOverlay.style.display = "none";
  resetGame();
}

// Update scoreboard display
function updateScoreboard() {
  scoreboard.textContent = `Red: ${scores[0]} | Blue: ${scores[1]}`;
}

// Show a floating message for 1 second
function showFloatingMessage(text) {
  const msg = document.createElement("div");
  msg.className = "floating-message";
  msg.textContent = text;
  messageContainer.appendChild(msg);
  setTimeout(() => msg.remove(), 1000);
}

// Check if the board is empty
function isBoardEmpty() {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (board[r][c] !== 0) return false;
    }
  }
  return true;
}

// Reset the game: clear board, alternate starting player, and show start message
function resetGame() {
  board = Array.from({ length: 10 }, () => Array(10).fill(0));
  currentPlayer = startingPlayer;
  startingPlayer = 3 - startingPlayer; // alternate starting player each game
  gameOver = false;
  grid.innerHTML = "";
  cells = [];

  for (let r = 0; r < 10; r++) {
    cells[r] = [];
    for (let c = 0; c < 10; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      grid.appendChild(cell);
      cells[r][c] = cell;
      cell.addEventListener("click", () => {
        if (gameOver || board[r][c] !== 0) return;
        // In computer mode, ignore clicks if it's computer's turn (player 1)
        if (mode === "computer" && currentPlayer === 1) return;
        makeMove(r, c, currentPlayer);
      });
    }
  }

  updateScoreboard();
  showFloatingMessage(`${classes[currentPlayer - 1].charAt(0).toUpperCase() + classes[currentPlayer - 1].slice(1)} starts!`);
  // If computer mode and computer (player 1) starts
  if (mode === "computer" && currentPlayer === 1) {
    // Special check: if the board is empty, choose a center move
    if (isBoardEmpty()) {
      setTimeout(() => { makeMove(4, 4, 1); }, 300);
    } else {
      setTimeout(computerMove, 300);
    }
  }
}

// Execute a move and check for a win
function makeMove(r, c, player) {
  board[r][c] = player;
  cells[r][c].classList.add(classes[player - 1]);
  if (checkWin(r, c, true)) {
    gameOver = true;
    scores[player - 1]++;
    updateScoreboard();
    setTimeout(() => alert(`${classes[player - 1].charAt(0).toUpperCase() + classes[player - 1].slice(1)} wins!`), 100);
    return;
  }
  currentPlayer = 3 - currentPlayer;
  if (mode === "computer" && currentPlayer === 1 && !gameOver) {
    setTimeout(computerMove, 300);
  }
}

// Improved AI: Check for opponent win threat and block, or choose best move
function computerMove() {
  // If board is empty, take central cell
  if (isBoardEmpty()) {
    makeMove(4, 4, 1);
    return;
  }
  let best = null, bestScore = -Infinity;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (board[r][c] === 0 && isNearMove(r, c)) {
        // Block: Check if opponent (player 2) can win with this move
        board[r][c] = 2;
        if (checkWin(r, c, false)) {
          board[r][c] = 0;
          best = [r, c];
          bestScore = Infinity;
          break;
        }
        board[r][c] = 0;
        
        // Evaluate move for computer: simulate computer move (player 1)
        board[r][c] = 1;
        // Increased weight for defensive blocking; adjust coefficient as needed
        let score = evaluateBoard(1) - 1.0 * evaluateBoard(2);
        board[r][c] = 0;
        if (score > bestScore) {
          bestScore = score;
          best = [r, c];
        }
      }
    }
  }
  if (best) {
    makeMove(best[0], best[1], 1);
  }
}

// Check if a cell is near an existing move (within a 1-cell radius)
function isNearMove(r, c) {
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (board[r + i]?.[c + j]) return true;
    }
  }
  return false;
}

// Evaluate the board for the given player using simple pattern scoring
function evaluateBoard(player) {
  let score = 0;
  const lines = [
    ...board,
    ...board[0].map((_, c) => board.map(row => row[c])),
    ...diagonals(board),
    ...diagonals(board.map(row => [...row].reverse()))
  ];
  for (let line of lines) {
    const str = line.map(cell => cell === player ? 'X' : ' ').join('');
    if (str.includes("XXXXX")) score += 1000;
    if (str.includes("XXXX")) score += 100;
    if (str.includes("XXX")) score += 10;
  }
  return score;
}

// Get all diagonals from the board (for pattern evaluation)
function diagonals(matrix) {
  const diags = [];
  for (let i = 0; i <= 2 * matrix.length - 1; i++) {
    let d1 = [], d2 = [];
    for (let j = 0; j <= i; j++) {
      let k = i - j;
      if (j < matrix.length && k < matrix.length) {
        d1.push(matrix[j][k]);
        d2.push(matrix[k][j]);
      }
    }
    diags.push(d1, d2);
  }
  return diags;
}

// Check win condition starting from cell (r,c) for the current player.
// If 'highlight' is true, add a glow to the winning cells.
function checkWin(r, c, highlight = false) {
  const player = board[r][c];
  const dirs = [[1,0], [0,1], [1,1], [1,-1]];
  for (let [dr, dc] of dirs) {
    let count = 1;
    const winCells = [[r, c]];
    for (let step of [-1, 1]) {
      let nr = r + step * dr, nc = c + step * dc;
      while (nr >= 0 && nr < 10 && nc >= 0 && nc < 10 && board[nr][nc] === player) {
        count++;
        winCells.push([nr, nc]);
        nr += step * dr;
        nc += step * dc;
      }
    }
    if (count >= 5) {
      if (highlight) {
        winCells.forEach(([wr, wc]) => cells[wr][wc].classList.add("highlight"));
      }
      return true;
    }
  }
  return false;
}

// Start the game by showing the mode selector overlay
showModeSelector();
