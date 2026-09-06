import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  createSolvedTiles,
  isSolved,
  selectTile,
  shuffleTiles,
} from '../src/puzzle.js';

test('creates solved tile order', () => {
  assert.deepEqual(createSolvedTiles(5), Array.from({ length: 25 }, (_, i) => i));
  assert.equal(isSolved(createSolvedTiles(5)), true);
});

test('shuffles tiles without leaving a solved board', () => {
  assert.deepEqual(shuffleTiles([0, 1, 2, 3], () => 0), [1, 2, 3, 0]);
  assert.equal(isSolved(shuffleTiles([0, 1, 2, 3], () => 0)), false);
});

test('creates a game and transitions through tile selection', () => {
  const game = createGame(5, () => 0);
  assert.equal(game.tiles.length, 25);
  assert.equal(game.selectedIndex, null);
  assert.equal(game.moves, 0);
  assert.equal(game.status, 'playing');
  assert.equal(isSolved(game.tiles), false);

  const almostSolved = { ...game, tiles: [1, 0, ...createSolvedTiles(5).slice(2)] };
  const selected = selectTile(almostSolved, 0);
  assert.equal(selected.selectedIndex, 0);
  assert.equal(selected.moves, 0);

  const cancelled = selectTile(selected, 0);
  assert.equal(cancelled.selectedIndex, null);
  assert.equal(cancelled.moves, 0);

  const completed = selectTile(selected, 1);
  assert.deepEqual(completed.tiles, createSolvedTiles(5));
  assert.equal(completed.moves, 1);
  assert.equal(completed.status, 'completed');
});

test('ignores selection attempts after the game is completed', () => {
  const completed = {
    size: 5,
    tiles: createSolvedTiles(5),
    selectedIndex: null,
    moves: 3,
    status: 'completed',
  };

  const next = selectTile(completed, 4);

  assert.equal(next, completed);
  assert.deepEqual(next.tiles, createSolvedTiles(5));
  assert.equal(next.selectedIndex, null);
  assert.equal(next.moves, 3);
  assert.equal(next.status, 'completed');
});
