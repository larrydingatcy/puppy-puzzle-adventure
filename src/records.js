import { SUPPORTED_SIZES, isSupportedSize } from './puzzle.js';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeMoves(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeTime(value) {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function createEmptyBestRecords() {
  return Object.fromEntries(
    SUPPORTED_SIZES.map((size) => [size, { bestMoves: null, bestTimeMs: null }]),
  );
}

export function normalizeBestRecords(value) {
  const source = isRecord(value) ? value : {};

  return Object.fromEntries(
    SUPPORTED_SIZES.map((size) => {
      const entry = isRecord(source[size]) ? source[size] : {};
      return [
        size,
        {
          bestMoves: normalizeMoves(entry.bestMoves),
          bestTimeMs: normalizeTime(entry.bestTimeMs),
        },
      ];
    }),
  );
}

export function updateBestRecords(records, size, moves, timeMs) {
  if (!isSupportedSize(size)) {
    throw new RangeError(`Unsupported puzzle size: ${size}`);
  }
  if (normalizeMoves(moves) === null) {
    throw new RangeError(`Invalid move count: ${moves}`);
  }
  if (normalizeTime(timeMs) === null) {
    throw new RangeError(`Invalid elapsed time: ${timeMs}`);
  }

  const nextRecords = normalizeBestRecords(records);
  const current = nextRecords[size];
  const newBestMoves = current.bestMoves === null || moves < current.bestMoves;
  const newBestTime = current.bestTimeMs === null || timeMs < current.bestTimeMs;

  nextRecords[size] = {
    bestMoves: newBestMoves ? moves : current.bestMoves,
    bestTimeMs: newBestTime ? timeMs : current.bestTimeMs,
  };

  return { records: nextRecords, newBestMoves, newBestTime };
}
