// engine.js — Luật cờ vua thuần (không phụ thuộc DOM)
// Biểu diễn bàn cờ: board[r][c], r=0 là hàng 8 (trên), r=7 là hàng 1 (dưới)
// c=0 là cột a (trái), c=7 là cột h (phải)

const FILES = 'abcdefgh';

function squareName(r, c) {
  return FILES[c] + (8 - r);
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

const KNIGHT_OFFSETS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_OFFSETS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];

class Chess {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Chess.initialBoard();
    this.turn = 'w';
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassant = null; // {r,c} square a pawn can capture onto
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = []; // { snapshot, move, san }
    this.status = 'playing'; // playing | check | checkmate | stalemate | draw-fifty | draw-material
  }

  static initialBoard() {
    const back = ['r','n','b','q','k','b','n','r'];
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let c = 0; c < 8; c++) {
      board[0][c] = { type: back[c], color: 'b' };
      board[1][c] = { type: 'p', color: 'b' };
      board[6][c] = { type: 'p', color: 'w' };
      board[7][c] = { type: back[c], color: 'w' };
    }
    return board;
  }

  cloneBoard() {
    return this.board.map(row => row.slice());
  }

  snapshot() {
    return {
      board: this.cloneBoard(),
      turn: this.turn,
      castling: { ...this.castling },
      enPassant: this.enPassant ? { ...this.enPassant } : null,
      halfmoveClock: this.halfmoveClock,
      fullmoveNumber: this.fullmoveNumber,
      status: this.status,
    };
  }

  clone() {
    const c = new Chess();
    c.board = this.cloneBoard();
    c.turn = this.turn;
    c.castling = { ...this.castling };
    c.enPassant = this.enPassant ? { ...this.enPassant } : null;
    c.halfmoveClock = this.halfmoveClock;
    c.fullmoveNumber = this.fullmoveNumber;
    c.history = [];
    c.status = this.status;
    return c;
  }

  findKing(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) return { r, c };
      }
    }
    return null;
  }

  isSquareAttacked(board, r, c, byColor) {
    // Pawns
    const pr = byColor === 'w' ? r + 1 : r - 1;
    if (inBounds(pr, c - 1)) {
      const p = board[pr][c - 1];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
    if (inBounds(pr, c + 1)) {
      const p = board[pr][c + 1];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
    // Knights
    for (const [dr, dc] of KNIGHT_OFFSETS) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p && p.color === byColor && p.type === 'n') return true;
      }
    }
    // King
    for (const [dr, dc] of KING_OFFSETS) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p && p.color === byColor && p.type === 'k') return true;
      }
    }
    // Sliding: rook/queen
    for (const [dr, dc] of ROOK_DIRS) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }
    // Sliding: bishop/queen
    for (const [dr, dc] of BISHOP_DIRS) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }
    return false;
  }

  isInCheck(color, board = this.board) {
    const king = this.findKing(board, color);
    if (!king) return false;
    const opp = color === 'w' ? 'b' : 'w';
    return this.isSquareAttacked(board, king.r, king.c, opp);
  }

  // Apply a move to a board copy, returning the new board (does not mutate state fields).
  applyToBoard(board, move) {
    const nb = board.map(row => row.slice());
    const piece = nb[move.from.r][move.from.c];
    nb[move.from.r][move.from.c] = null;

    if (move.isEnPassant) {
      nb[move.from.r][move.to.c] = null; // captured pawn is beside, same row as origin
    }

    let placed = piece;
    if (move.promotion) {
      placed = { type: move.promotion, color: piece.color };
    }
    nb[move.to.r][move.to.c] = placed;

    if (move.isCastle === 'K') {
      const row = move.from.r;
      const rook = nb[row][7];
      nb[row][7] = null;
      nb[row][5] = rook;
    } else if (move.isCastle === 'Q') {
      const row = move.from.r;
      const rook = nb[row][0];
      nb[row][0] = null;
      nb[row][3] = rook;
    }
    return nb;
  }

  generatePseudoMoves(color, board = this.board) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p || p.color !== color) continue;
        switch (p.type) {
          case 'p': this.genPawnMoves(board, r, c, color, moves); break;
          case 'n': this.genStepMoves(board, r, c, color, KNIGHT_OFFSETS, moves); break;
          case 'k': this.genKingMoves(board, r, c, color, moves); break;
          case 'r': this.genSlideMoves(board, r, c, color, ROOK_DIRS, moves); break;
          case 'b': this.genSlideMoves(board, r, c, color, BISHOP_DIRS, moves); break;
          case 'q':
            this.genSlideMoves(board, r, c, color, ROOK_DIRS, moves);
            this.genSlideMoves(board, r, c, color, BISHOP_DIRS, moves);
            break;
        }
      }
    }
    return moves;
  }

  genPawnMoves(board, r, c, color, moves) {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const lastRow = color === 'w' ? 0 : 7;
    const addPromo = (from, to, captured) => {
      if (to.r === lastRow) {
        for (const promo of ['q', 'r', 'b', 'n']) {
          moves.push({ from, to, piece: 'p', color, captured, promotion: promo });
        }
      } else {
        moves.push({ from, to, piece: 'p', color, captured });
      }
    };
    // forward
    const r1 = r + dir;
    if (inBounds(r1, c) && !board[r1][c]) {
      addPromo({ r, c }, { r: r1, c }, null);
      const r2 = r + dir * 2;
      if (r === startRow && !board[r2][c]) {
        moves.push({ from: { r, c }, to: { r: r2, c }, piece: 'p', color, captured: null, isDoubleStep: true });
      }
    }
    // captures
    for (const dc of [-1, 1]) {
      const nc = c + dc;
      if (!inBounds(r1, nc)) continue;
      const target = board[r1][nc];
      if (target && target.color !== color) {
        addPromo({ r, c }, { r: r1, c: nc }, target.type);
      } else if (!target && this.enPassant && this.enPassant.r === r1 && this.enPassant.c === nc) {
        moves.push({ from: { r, c }, to: { r: r1, c: nc }, piece: 'p', color, captured: 'p', isEnPassant: true });
      }
    }
  }

  genStepMoves(board, r, c, color, offsets, moves) {
    const p = board[r][c];
    for (const [dr, dc] of offsets) {
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (!target || target.color !== color) {
        moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece: p.type, color, captured: target ? target.type : null });
      }
    }
  }

  genSlideMoves(board, r, c, color, dirs, moves) {
    const p = board[r][c];
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (!target) {
          moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece: p.type, color, captured: null });
        } else {
          if (target.color !== color) {
            moves.push({ from: { r, c }, to: { r: nr, c: nc }, piece: p.type, color, captured: target.type });
          }
          break;
        }
        nr += dr; nc += dc;
      }
    }
  }

  genKingMoves(board, r, c, color, moves) {
    this.genStepMoves(board, r, c, color, KING_OFFSETS, moves);
    // Castling
    const opp = color === 'w' ? 'b' : 'w';
    const row = color === 'w' ? 7 : 0;
    if (r !== row || c !== 4) return;
    if (this.isSquareAttacked(board, r, c, opp)) return; // can't castle out of check

    const canK = color === 'w' ? this.castling.wK : this.castling.bK;
    if (canK && !board[row][5] && !board[row][6] && board[row][7] && board[row][7].type === 'r' && board[row][7].color === color) {
      if (!this.isSquareAttacked(board, row, 5, opp) && !this.isSquareAttacked(board, row, 6, opp)) {
        moves.push({ from: { r, c }, to: { r: row, c: 6 }, piece: 'k', color, captured: null, isCastle: 'K' });
      }
    }
    const canQ = color === 'w' ? this.castling.wQ : this.castling.bQ;
    if (canQ && !board[row][3] && !board[row][2] && !board[row][1] && board[row][0] && board[row][0].type === 'r' && board[row][0].color === color) {
      if (!this.isSquareAttacked(board, row, 3, opp) && !this.isSquareAttacked(board, row, 2, opp)) {
        moves.push({ from: { r, c }, to: { r: row, c: 2 }, piece: 'k', color, captured: null, isCastle: 'Q' });
      }
    }
  }

  generateLegalMoves(color, board = this.board) {
    const pseudo = this.generatePseudoMoves(color, board);
    const legal = [];
    for (const m of pseudo) {
      const nb = this.applyToBoard(board, m);
      if (!this.isInCheck(color, nb)) legal.push(m);
    }
    return legal;
  }

  moveToSAN(move, legalMovesBefore) {
    if (move.isCastle === 'K') return this.sanSuffix(move, 'O-O');
    if (move.isCastle === 'Q') return this.sanSuffix(move, 'O-O-O');

    const destSq = squareName(move.to.r, move.to.c);
    const isCapture = !!move.captured;

    if (move.piece === 'p') {
      let san = isCapture ? FILES[move.from.c] + 'x' + destSq : destSq;
      if (move.promotion) san += '=' + move.promotion.toUpperCase();
      return this.sanSuffix(move, san);
    }

    const letter = move.piece.toUpperCase();
    const ambiguous = legalMovesBefore.filter(m =>
      m.piece === move.piece && !m.isCastle &&
      m.to.r === move.to.r && m.to.c === move.to.c &&
      !(m.from.r === move.from.r && m.from.c === move.from.c)
    );
    let disambig = '';
    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some(m => m.from.c === move.from.c);
      const sameRank = ambiguous.some(m => m.from.r === move.from.r);
      if (!sameFile) disambig = FILES[move.from.c];
      else if (!sameRank) disambig = String(8 - move.from.r);
      else disambig = FILES[move.from.c] + String(8 - move.from.r);
    }
    const san = letter + disambig + (isCapture ? 'x' : '') + destSq;
    return this.sanSuffix(move, san);
  }

  sanSuffix(move, base) {
    // Caller fills in +/# after making the move; placeholder kept for clarity.
    return base;
  }

  makeMove(move) {
    const legalBefore = this.generateLegalMoves(this.turn);
    let san = this.moveToSAN(move, legalBefore);

    this.history.push({ snapshot: this.snapshot(), move });

    const movingColor = this.turn;
    this.board = this.applyToBoard(this.board, move);

    // Update castling rights
    const clearRights = (r, c) => {
      if (r === 7 && c === 4) { this.castling.wK = false; this.castling.wQ = false; }
      if (r === 0 && c === 4) { this.castling.bK = false; this.castling.bQ = false; }
      if (r === 7 && c === 0) this.castling.wQ = false;
      if (r === 7 && c === 7) this.castling.wK = false;
      if (r === 0 && c === 0) this.castling.bQ = false;
      if (r === 0 && c === 7) this.castling.bK = false;
    };
    clearRights(move.from.r, move.from.c);
    if (move.captured) clearRights(move.to.r, move.to.c);

    // Update en passant target
    if (move.isDoubleStep) {
      const dir = movingColor === 'w' ? -1 : 1;
      this.enPassant = { r: move.from.r + dir, c: move.from.c };
    } else {
      this.enPassant = null;
    }

    // Halfmove clock (50-move rule)
    if (move.piece === 'p' || move.captured) this.halfmoveClock = 0;
    else this.halfmoveClock++;

    if (movingColor === 'b') this.fullmoveNumber++;
    this.turn = movingColor === 'w' ? 'b' : 'w';

    this.updateStatus();

    if (this.status === 'checkmate') san += '#';
    else if (this.status === 'check') san += '+';
    this.history[this.history.length - 1].san = san;

    return san;
  }

  undoMove() {
    const last = this.history.pop();
    if (!last) return false;
    const s = last.snapshot;
    this.board = s.board;
    this.turn = s.turn;
    this.castling = s.castling;
    this.enPassant = s.enPassant;
    this.halfmoveClock = s.halfmoveClock;
    this.fullmoveNumber = s.fullmoveNumber;
    this.status = s.status;
    return true;
  }

  isInsufficientMaterial() {
    const pieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.type !== 'k') pieces.push(p);
      }
    }
    if (pieces.length === 0) return true;
    if (pieces.length === 1 && (pieces[0].type === 'b' || pieces[0].type === 'n')) return true;
    return false;
  }

  updateStatus() {
    const inCheck = this.isInCheck(this.turn);
    const legal = this.generateLegalMoves(this.turn);
    if (legal.length === 0) {
      this.status = inCheck ? 'checkmate' : 'stalemate';
      return;
    }
    if (this.halfmoveClock >= 100) {
      this.status = 'draw-fifty';
      return;
    }
    if (this.isInsufficientMaterial()) {
      this.status = 'draw-material';
      return;
    }
    this.status = inCheck ? 'check' : 'playing';
  }

  isGameOver() {
    return ['checkmate', 'stalemate', 'draw-fifty', 'draw-material'].includes(this.status);
  }
}

if (typeof module !== 'undefined') module.exports = { Chess, squareName };
