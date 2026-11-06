import test from 'node:test';
import assert from 'node:assert/strict';
import { createDragState, finishDrag, updateDragState } from '../src/drag.js';

test('keeps movement below the eight-pixel drag threshold as a tap', () => {
  const started = createDragState(2, 11, 100, 100);
  const moved = updateDragState(started, 11, 107, 100, 4);

  assert.equal(moved.dragged, false);
  assert.deepEqual(finishDrag(moved, 11, 2), {
    type: 'tap',
    sourceIndex: 2,
    targetIndex: 2,
  });
});

test('crossing the threshold onto another piece produces a swap', () => {
  const started = createDragState(2, 11, 100, 100);
  const moved = updateDragState(started, 11, 108, 100, 4);

  assert.equal(moved.dragged, true);
  assert.equal(moved.targetIndex, 4);
  assert.deepEqual(finishDrag(moved, 11, 4), {
    type: 'swap',
    sourceIndex: 2,
    targetIndex: 4,
  });
  assert.equal(started.dragged, false, 'updates must not mutate the starting state');
});

test('ignores updates from a different pointer', () => {
  const started = createDragState(2, 11, 100, 100);

  assert.equal(updateDragState(started, 12, 150, 150, 4), started);
  assert.deepEqual(finishDrag(started, 12, 2), {
    type: 'cancel',
    sourceIndex: 2,
    targetIndex: null,
  });
});

test('cancels a drag dropped on its source or outside the board', () => {
  const dragged = updateDragState(createDragState(2, 11, 100, 100), 11, 120, 120, 4);

  assert.deepEqual(finishDrag(dragged, 11, 2), {
    type: 'cancel',
    sourceIndex: 2,
    targetIndex: 2,
  });
  assert.deepEqual(finishDrag(dragged, 11, null), {
    type: 'cancel',
    sourceIndex: 2,
    targetIndex: null,
  });
});

test('pointer cancellation returns cancel without a swap target', () => {
  const dragged = updateDragState(createDragState(5, 21, 0, 0), 21, 20, 0, 8);

  assert.deepEqual(finishDrag(dragged, 21, null), {
    type: 'cancel',
    sourceIndex: 5,
    targetIndex: null,
  });
});
