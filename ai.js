// ai.js — Minimax + alpha-beta pruning cho máy đánh cờ

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Bảng vị trí đơn giản (từ góc nhìn quân Trắng, hàng 0 = hàng 8)
const PAWN_TABLE = [
  [0,0,0,0,0,0,0,0],
  [50,50,50,50,50,50,50,50],
  [10,10,20,30,30,20,10,10],
  [5,5,10,25,25,10,5,5],
  [0,0,0,20,20,0,0,0],
  [5,-5,-10,0,0,-10,-5,5],
  [5,10,10,-20,-20,10,10,5],
  [0,0,0,0,0,0,0,0],
];
const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,0,0,0,0,-20,-40],
  [-30,0,10,15,15,10,0,-30],
  [-30,5,15,20,20,15,5,-30],
  [-30,0,15,20,20,15,0,-30],
  [-30,5,10,15,15,10,5,-30],
  [-40,-20,0,5,5,0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];
const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,0,0,0,0,0,0,-10],
  [-10,0,5,10,10,5,0,-10],
  [-10,5,5,10,10,5,5,-10],
  [-10,0,10,10,10,10,0,-10],
  [-10,10,10,10,10,10,10,-10],
  [-10,5,0,0,0,0,5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];
const ROOK_TABLE = [
  [0,0,0,0,0,0,0,0],
  [5,10,10,10,10,10,10,5],
  [-5,0,0,0,0,0,0,-5],
  [-5,0,0,0,0,0,0,-5],
  [-5,0,0,0,0,0,0,-5],
  [-5,0,0,0,0,0,0,-5],
  [-5,0,0,0,0,0,0,-5],
  [0,0,0,5,5,0,0,0],
];
const QUEEN_TABLE = [
  [-20,-10,-10,-5,-5,-10,-10,-20],
  [-10,0,0,0,0,0,0,-10],
  [-10,0,5,5,5,5,0,-10],
  [-5,0,5,5,5,5,0,-5],
  [0,0,5,5,5,5,0,-5],
  [-10,5,5,5,5,5,0,-10],
  [-10,0,5,0,0,0,0,-10],
  [-20,-10,-10,-5,-5,-10,-10,-20],
];
const KING_TABLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20,20,0,0,0,0,20,20],
  [20,30,10,0,0,10,30,20],
];
const TABLES = { p: PAWN_TABLE, n: KNIGHT_TABLE, b: BISHOP_TABLE, r: ROOK_TABLE, q: QUEEN_TABLE, k: KING_TABLE };

function evaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const base = PIECE_VALUES[p.type];
      const table = TABLES[p.type];
      const posScore = p.color === 'w' ? table[r][c] : table[7 - r][c];
      const value = base + posScore;
      score += p.color === 'w' ? value : -value;
    }
  }
  return score;
}

function orderMoves(moves) {
  const score = (m) => (m.captured ? PIECE_VALUES[m.captured] : 0) + (m.promotion ? 800 : 0);
  return moves.slice().sort((a, b) => score(b) - score(a));
}

function negamax(chess, depth, alpha, beta) {
  if (chess.isGameOver()) {
    if (chess.status === 'checkmate') return -99000 - depth;
    return 0;
  }
  if (depth === 0) {
    const score = evaluateBoard(chess.board);
    return chess.turn === 'w' ? score : -score;
  }
  const moves = orderMoves(chess.generateLegalMoves(chess.turn));
  if (moves.length === 0) {
    const inCheck = chess.isInCheck(chess.turn);
    return inCheck ? -99000 - depth : 0;
  }
  let best = -Infinity;
  for (const m of moves) {
    const child = chess.clone();
    child.makeMove(m);
    const score = -negamax(child, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function pickBestMove(chess, depth) {
  const moves = orderMoves(chess.generateLegalMoves(chess.turn));
  if (moves.length === 0) return null;
  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;
  for (const m of moves) {
    const child = chess.clone();
    child.makeMove(m);
    const score = -negamax(child, depth - 1, -beta, -alpha);
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
    if (bestScore > alpha) alpha = bestScore;
  }
  return bestMove;
}

if (typeof module !== 'undefined') module.exports = { pickBestMove, evaluateBoard };
