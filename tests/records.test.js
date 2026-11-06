import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyBestRecords,
  normalizeBestRecords,
  updateBestRecords,
} from '../src/records.js';

const emptyRecords = {
  5: { bestMoves: null, bestTimeMs: null },
  7: { bestMoves: null, bestTimeMs: null },
  9: { bestMoves: null, bestTimeMs: null },
};

test('creates independent empty records for every supported size', () => {
  const first = createEmptyBestRecords();
  const second = createEmptyBestRecords();

  assert.deepEqual(first, emptyRecords);
  assert.notEqual(first, second);
  assert.notEqual(first[5], second[5]);
});

test('normalizes corrupt record containers to fresh empty records', () => {
  for (const value of [null, undefined, 'broken', [], 42]) {
    assert.deepEqual(normalizeBestRecords(value), emptyRecords);
  }

  const source = { 5: { bestMoves: 12, bestTimeMs: 3_000 } };
  const normalized = normalizeBestRecords(source);
  assert.deepEqual(normalized, {
    5: { bestMoves: 12, bestTimeMs: 3_000 },
    7: { bestMoves: null, bestTimeMs: null },
    9: { bestMoves: null, bestTimeMs: null },
  });
  assert.notEqual(normalized, source);
  assert.notEqual(normalized[5], source[5]);
});

test('drops non-finite, negative, and non-integer stored metrics', () => {
  assert.deepEqual(
    normalizeBestRecords({
      5: { bestMoves: 0, bestTimeMs: -1 },
      7: { bestMoves: 2.5, bestTimeMs: Number.POSITIVE_INFINITY },
      9: { bestMoves: 9, bestTimeMs: 0 },
    }),
    {
      5: { bestMoves: null, bestTimeMs: null },
      7: { bestMoves: null, bestTimeMs: null },
      9: { bestMoves: 9, bestTimeMs: 0 },
    },
  );
});

test('records both metrics for the first result without changing other sizes', () => {
  const result = updateBestRecords(emptyRecords, 7, 40, 90_000);

  assert.deepEqual(result, {
    records: {
      5: { bestMoves: null, bestTimeMs: null },
      7: { bestMoves: 40, bestTimeMs: 90_000 },
      9: { bestMoves: null, bestTimeMs: null },
    },
    newBestMoves: true,
    newBestTime: true,
  });
  assert.deepEqual(emptyRecords[7], { bestMoves: null, bestTimeMs: null });
});

test('improves each metric independently', () => {
  const records = {
    5: { bestMoves: 30, bestTimeMs: 60_000 },
    7: { bestMoves: null, bestTimeMs: null },
    9: { bestMoves: null, bestTimeMs: null },
  };

  assert.deepEqual(updateBestRecords(records, 5, 25, 70_000), {
    records: {
      5: { bestMoves: 25, bestTimeMs: 60_000 },
      7: { bestMoves: null, bestTimeMs: null },
      9: { bestMoves: null, bestTimeMs: null },
    },
    newBestMoves: true,
    newBestTime: false,
  });

  assert.deepEqual(updateBestRecords(records, 5, 35, 50_000), {
    records: {
      5: { bestMoves: 30, bestTimeMs: 50_000 },
      7: { bestMoves: null, bestTimeMs: null },
      9: { bestMoves: null, bestTimeMs: null },
    },
    newBestMoves: false,
    newBestTime: true,
  });
});

test('leaves records unchanged when a result is not better', () => {
  const records = {
    5: { bestMoves: 30, bestTimeMs: 60_000 },
    7: { bestMoves: null, bestTimeMs: null },
    9: { bestMoves: null, bestTimeMs: null },
  };

  assert.deepEqual(updateBestRecords(records, 5, 30, 60_000), {
    records,
    newBestMoves: false,
    newBestTime: false,
  });
});

test('rejects unsupported sizes and invalid result metrics', () => {
  assert.throws(() => updateBestRecords(emptyRecords, 6, 10, 1_000), /Unsupported puzzle size/);
  assert.throws(() => updateBestRecords(emptyRecords, 5, 0, 1_000), /Invalid move count/);
  assert.throws(() => updateBestRecords(emptyRecords, 5, 10.5, 1_000), /Invalid move count/);
  assert.throws(() => updateBestRecords(emptyRecords, 5, 10, -1), /Invalid elapsed time/);
  assert.throws(() => updateBestRecords(emptyRecords, 5, 10, Number.NaN), /Invalid elapsed time/);
});
