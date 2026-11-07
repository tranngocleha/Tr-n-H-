// app.js — Giao diện & điều khiển trò chơi

const UNICODE = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const PIECE_NAME_VI = { k: 'Vua', q: 'Hậu', r: 'Xe', b: 'Tượng', n: 'Mã', p: 'Chốt' };

let game = new Chess();
let selected = null; // {r,c}
let legalForSelected = [];
let flipped = false;
let lastMove = null;
let mode = 'ai';
let aiDifficulty = 3;
let humanSide = 'w';
let pendingPromotion = null; // {from,to,piece,color,captured}
let aiThinking = false;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const moveListEl = document.getElementById('move-list');
const capturedWEl = document.getElementById('captured-w');
const capturedBEl = document.getElementById('captured-b');
const modeSelect = document.getElementById('mode-select');
const difficultySelect = document.getElementById('difficulty-select');
const sideSelect = document.getElementById('side-select');
const aiOptions = document.getElementById('ai-options');
const promotionModal = document.getElementById('promotion-modal');
const promotionChoices = document.getElementById('promotion-choices');

function buildBoardDOM() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 64; i++) {
    const sq = document.createElement('div');
    sq.className = 'square';
    sq.dataset.index = i;
    sq.addEventListener('click', onSquareClick);
    boardEl.appendChild(sq);
  }
}

function displayRC(r, c) {
  // Convert logical (r,c) to a display index depending on flip state
  const dr = flipped ? 7 - r : r;
  const dc = flipped ? 7 - c : c;
  return dr * 8 + dc;
}

function render() {
  const squares = boardEl.children;
  const checkedKingColor = (game.status === 'check' || game.status === 'checkmate') ? game.turn : null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const idx = displayRC(r, c);
      const sq = squares[idx];
      sq.innerHTML = '';
      sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.r = r;
      sq.dataset.c = c;

      const piece = game.board[r][c];
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece ' + (piece.color === 'w' ? 'white' : 'black');
        span.textContent = UNICODE[piece.color][piece.type];
        sq.appendChild(span);
      }

      if (selected && selected.r === r && selected.c === c) sq.classList.add('selected');
      if (lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c))) {
        sq.classList.add('last-move');
      }
      if (piece && piece.type === 'k' && piece.color === checkedKingColor) {
        sq.classList.add('in-check');
      }

      const legalMove = legalForSelected.find(m => m.to.r === r && m.to.c === c);
      if (legalMove) {
        const marker = document.createElement('div');
        marker.className = legalMove.captured || legalMove.isEnPassant ? 'capture-ring' : 'move-dot';
        sq.appendChild(marker);
      }
    }
  }
  renderStatus();
  renderCaptured();
}

function renderStatus() {
  let text;
  const turnText = game.turn === 'w' ? 'Trắng' : 'Đen';
  switch (game.status) {
    case 'checkmate': {
      const winner = game.turn === 'w' ? 'Đen' : 'Trắng';
      text = `Chiếu hết! ${winner} thắng`;
      break;
    }
    case 'stalemate': text = 'Hết nước đi hợp lệ — Hòa'; break;
    case 'draw-fifty': text = 'Hòa theo luật 50 nước'; break;
    case 'draw-material': text = 'Hòa do thiếu quân để chiếu hết'; break;
    case 'check': text = `${turnText} đi — Đang bị chiếu!`; break;
    default: text = `${turnText} đi`;
  }
  if (aiThinking) text = 'Máy đang suy nghĩ...';
  statusEl.textContent = text;
}

function renderCaptured() {
  const captured = { w: [], b: [] };
  for (const h of game.history) {
    if (h.move.captured) {
      const capturedColor = h.move.color === 'w' ? 'b' : 'w';
      captured[h.move.color].push(UNICODE[capturedColor][h.move.captured]);
    }
  }
  capturedWEl.textContent = captured.w.join(' ');
  capturedBEl.textContent = captured.b.join(' ');
}

function renderMoveList() {
  moveListEl.innerHTML = '';
  for (let i = 0; i < game.history.length; i += 2) {
    const li = document.createElement('li');
    const whiteSan = game.history[i] ? game.history[i].san : '';
    const blackSan = game.history[i + 1] ? game.history[i + 1].san : '';
    li.textContent = `${whiteSan}${blackSan ? '   ' + blackSan : ''}`;
    moveListEl.appendChild(li);
  }
}

function onSquareClick(e) {
  if (game.isGameOver() || aiThinking) return;
  if (mode === 'ai' && game.turn !== humanSide) return;

  const r = parseInt(e.currentTarget.dataset.r, 10);
  const c = parseInt(e.currentTarget.dataset.c, 10);
  const piece = game.board[r][c];

  if (selected) {
    const candidates = legalForSelected.filter(m => m.to.r === r && m.to.c === c);
    if (candidates.length > 1) {
      askPromotion(candidates[0]);
      return;
    }
    if (candidates.length === 1) {
      performMove(candidates[0]);
      return;
    }
    if (selected.r === r && selected.c === c) {
      clearSelection();
      render();
      return;
    }
    if (piece && piece.color === game.turn) {
      selectSquare(r, c);
      render();
      return;
    }
    clearSelection();
    render();
    return;
  }

  if (piece && piece.color === game.turn) {
    selectSquare(r, c);
    render();
  }
}

function selectSquare(r, c) {
  selected = { r, c };
  const all = game.generateLegalMoves(game.turn);
  legalForSelected = all.filter(m => m.from.r === r && m.from.c === c);
}

function clearSelection() {
  selected = null;
  legalForSelected = [];
}

function askPromotion(move) {
  pendingPromotion = move;
  promotionChoices.innerHTML = '';
  const color = move.color;
  for (const type of ['q', 'r', 'b', 'n']) {
    const btn = document.createElement('button');
    btn.textContent = UNICODE[color][type];
    btn.title = PIECE_NAME_VI[type];
    btn.addEventListener('click', () => {
      const chosen = legalForSelected.find(m => m.to.r === move.to.r && m.to.c === move.to.c && m.promotion === type);
      promotionModal.classList.add('hidden');
      performMove(chosen || move);
    });
    promotionChoices.appendChild(btn);
  }
  promotionModal.classList.remove('hidden');
}

function performMove(move) {
  game.makeMove(move);
  lastMove = move;
  clearSelection();
  render();
  renderMoveList();

  if (game.isGameOver()) return;

  if (mode === 'ai' && game.turn !== humanSide) {
    scheduleAiMove();
  }
}

function scheduleAiMove() {
  aiThinking = true;
  renderStatus();
  setTimeout(() => {
    const move = pickBestMove(game, aiDifficulty);
    aiThinking = false;
    if (move) performMove(move);
    else render();
  }, 50);
}

function newGame() {
  game = new Chess();
  selected = null;
  legalForSelected = [];
  lastMove = null;
  aiThinking = false;
  render();
  renderMoveList();

  if (mode === 'ai' && humanSide === 'b') {
    scheduleAiMove();
  }
}

function undo() {
  if (aiThinking) return;
  if (mode === 'ai') {
    // Undo AI reply and player's move so it's the human's turn again
    if (game.history.length > 0 && game.history[game.history.length - 1].move.color !== humanSide) {
      game.undoMove();
    }
    if (game.history.length > 0) game.undoMove();
  } else {
    game.undoMove();
  }
  clearSelection();
  lastMove = game.history.length > 0 ? game.history[game.history.length - 1].move : null;
  render();
  renderMoveList();
}

modeSelect.addEventListener('change', () => {
  mode = modeSelect.value;
  aiOptions.style.display = mode === 'ai' ? 'flex' : 'none';
  newGame();
});

difficultySelect.addEventListener('change', () => {
  aiDifficulty = parseInt(difficultySelect.value, 10);
});

sideSelect.addEventListener('change', () => {
  humanSide = sideSelect.value;
  newGame();
});

document.getElementById('new-game-btn').addEventListener('click', newGame);
document.getElementById('undo-btn').addEventListener('click', undo);
document.getElementById('flip-btn').addEventListener('click', () => {
  flipped = !flipped;
  render();
});

mode = modeSelect.value;
aiDifficulty = parseInt(difficultySelect.value, 10);
humanSide = sideSelect.value;
aiOptions.style.display = mode === 'ai' ? 'flex' : 'none';

buildBoardDOM();
newGame();
