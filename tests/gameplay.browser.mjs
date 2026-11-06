import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(testsDirectory);
const uploadFixture = path.join(testsDirectory, 'fixtures', 'upload-test.svg');
const unavailableStorageFixture = path.join(testsDirectory, 'fixtures', 'storage-throws.js');
const session = `puppy-gameplay-${process.pid}`;
const browserEnvironment = { ...process.env, AGENT_BROWSER_SESSION: session };
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = path.resolve(projectDirectory, relativePath);

    if (!filePath.startsWith(`${projectDirectory}${path.sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, { 'content-type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

const execFileAsync = promisify(execFile);
const runBrowser = async (...args) => {
  const { stdout } = await execFileAsync('agent-browser', args, {
    encoding: 'utf8',
    env: browserEnvironment,
  });
  return stdout;
};
const evaluate = async (expression) => JSON.parse(await runBrowser('eval', expression));
const centerOf = (selector) => evaluate(`(() => {
  const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
  return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
})()`);
const moveMouse = (point) => runBrowser('mouse', 'move', String(point.x), String(point.y));
const solveCurrentPuzzle = () => evaluate(`(() => {
  const buttons = () => [...document.querySelectorAll('.puzzle-piece')];
  const tiles = () => buttons().map((button) => Number(button.getAttribute('aria-label').match(/^Piece (\\d+)/)[1]) - 1);
  let swaps = 0;

  for (let position = 0; position < buttons().length; position += 1) {
    const currentTiles = tiles();
    if (currentTiles[position] === position) continue;
    const target = currentTiles.indexOf(position);
    buttons()[position].click();
    buttons()[target].click();
    swaps += 1;
  }

  return {
    swaps,
    moves: Number(document.querySelector('#moves').textContent),
    dialogOpen: document.querySelector('#completion-dialog').open,
    finalMoves: Number(document.querySelector('#final-moves').textContent),
    finalTime: document.querySelector('#final-time').textContent,
  };
})()`);

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const url = `http://127.0.0.1:${address.port}`;

try {
  await runBrowser('open', url);
  await runBrowser('wait', '--load', 'networkidle');

  await runBrowser('focus', '#start-button');
  await runBrowser('press', 'Enter');
  await runBrowser('focus', '.puzzle-piece[data-index="0"]');
  await runBrowser('press', 'Enter');
  await runBrowser('focus', '.puzzle-piece[data-index="1"]');
  await runBrowser('press', 'Space');
  assert.equal(await evaluate('document.querySelector("#moves").textContent'), '1');

  await runBrowser('click', '#restart-button');
  await runBrowser('click', '.puzzle-piece[data-index="0"]');
  await runBrowser('click', '.puzzle-piece[data-index="1"]');
  assert.equal(await evaluate('document.querySelector("#moves").textContent'), '1');

  await runBrowser('click', '#restart-button');
  const first = await centerOf('.puzzle-piece[data-index="0"]');
  const second = await centerOf('.puzzle-piece[data-index="1"]');
  await moveMouse(first);
  await runBrowser('mouse', 'down', 'left');
  await moveMouse(second);
  await runBrowser('mouse', 'up', 'left');
  assert.deepEqual(await evaluate(`({
    moves: document.querySelector('#moves').textContent,
    status: document.querySelector('#live-status').textContent,
  })`), {
    moves: '1',
    status: 'Pieces swapped by drag. 1 moves.',
  });

  await runBrowser('click', '#restart-button');
  const tapStart = await centerOf('.puzzle-piece[data-index="0"]');
  await moveMouse(tapStart);
  await runBrowser('mouse', 'down', 'left');
  await moveMouse({ x: tapStart.x + 4, y: tapStart.y });
  await runBrowser('mouse', 'up', 'left');
  assert.deepEqual(await evaluate(`({
    moves: document.querySelector('#moves').textContent,
    selected: document.querySelector('.puzzle-piece[data-index="0"]').getAttribute('aria-pressed'),
  })`), { moves: '0', selected: 'true' });

  await runBrowser('click', '#restart-button');
  const board = await evaluate(`(() => {
    const rect = document.querySelector('#puzzle').getBoundingClientRect();
    return { outsideX: Math.max(1, Math.round(rect.left - 12)), outsideY: Math.max(1, Math.round(rect.top - 12)) };
  })()`);
  const cancelStart = await centerOf('.puzzle-piece[data-index="0"]');
  await moveMouse(cancelStart);
  await runBrowser('mouse', 'down', 'left');
  await moveMouse({ x: board.outsideX, y: board.outsideY });
  await runBrowser('mouse', 'up', 'left');
  assert.deepEqual(await evaluate(`({
    moves: document.querySelector('#moves').textContent,
    status: document.querySelector('#live-status').textContent,
  })`), { moves: '0', status: 'Drag cancelled. No pieces were moved.' });

  await runBrowser('upload', '#image-upload', uploadFixture);
  await runBrowser('wait', '--fn', "document.querySelector('#preview-image').src.startsWith('blob:')");
  assert.deepEqual(await evaluate(`({
    pieces: document.querySelectorAll('.puzzle-piece').length,
    moves: document.querySelector('#moves').textContent,
    ratio: Number.parseFloat(document.querySelector('#puzzle').style.aspectRatio),
  })`), { pieces: 25, moves: '0', ratio: 1.5 });

  await runBrowser('click', '#difficulty-7');
  assert.deepEqual(await evaluate(`({
    pieces: document.querySelectorAll('.puzzle-piece').length,
    difficulty: document.querySelector('#current-difficulty').textContent,
  })`), { pieces: 49, difficulty: '7×7' });

  await runBrowser('click', '#difficulty-9');
  assert.deepEqual(await evaluate(`({
    pieces: document.querySelectorAll('.puzzle-piece').length,
    difficulty: document.querySelector('#current-difficulty').textContent,
  })`), { pieces: 81, difficulty: '9×9' });

  for (const [width, height] of [[390, 844], [1024, 768]]) {
    await runBrowser('set', 'viewport', String(width), String(height));
    assert.equal(
      await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),
      true,
      `${width}×${height} must not scroll horizontally`,
    );
  }

  await runBrowser('storage', 'local', 'clear');
  await runBrowser('reload');
  await runBrowser('wait', '--load', 'networkidle');
  await runBrowser('click', '#start-button');
  const firstCompletion = await solveCurrentPuzzle();
  assert.equal(firstCompletion.dialogOpen, true);
  assert.equal(firstCompletion.moves, firstCompletion.swaps);
  assert.equal(firstCompletion.finalMoves, firstCompletion.swaps);
  assert.match(firstCompletion.finalTime, /^\d{2}:\d{2}$/);
  assert.deepEqual(await evaluate(`(() => {
    const stored = JSON.parse(localStorage.getItem('puppy-puzzle-best-v1'));
    return {
      storedMoves: stored[5].bestMoves,
      storedTimeIsNumber: Number.isFinite(stored[5].bestTimeMs),
      displayedMoves: document.querySelector('#best-moves').textContent,
      displayedTime: document.querySelector('#best-time').textContent,
    };
  })()`), {
    storedMoves: firstCompletion.swaps,
    storedTimeIsNumber: true,
    displayedMoves: String(firstCompletion.swaps),
    displayedTime: firstCompletion.finalTime,
  });

  await runBrowser('click', '#replay-button');
  assert.deepEqual(await evaluate(`({
    dialogOpen: document.querySelector('#completion-dialog').open,
    difficulty: document.querySelector('#current-difficulty').textContent,
    pieces: document.querySelectorAll('.puzzle-piece').length,
    moves: document.querySelector('#moves').textContent,
  })`), { dialogOpen: false, difficulty: '5×5', pieces: 25, moves: '0' });

  await solveCurrentPuzzle();
  await runBrowser('click', '#next-difficulty-button');
  assert.deepEqual(await evaluate(`({
    difficulty: document.querySelector('#current-difficulty').textContent,
    pieces: document.querySelectorAll('.puzzle-piece').length,
  })`), { difficulty: '7×7', pieces: 49 });

  await runBrowser('click', '#difficulty-9');
  await solveCurrentPuzzle();
  await runBrowser('click', '#next-difficulty-button');
  assert.deepEqual(await evaluate(`({
    difficulty: document.querySelector('#current-difficulty').textContent,
    pieces: document.querySelectorAll('.puzzle-piece').length,
    moves: document.querySelector('#moves').textContent,
  })`), { difficulty: '9×9', pieces: 81, moves: '0' });

  await runBrowser('close');
  await runBrowser('open', url, '--init-script', unavailableStorageFixture);
  await runBrowser('wait', '--load', 'networkidle');
  await runBrowser('click', '#start-button');
  assert.doesNotMatch(
    await evaluate('document.querySelector("#live-status").textContent'),
    /unavailable|could not be saved/i,
  );
  const noStorageCompletion = await solveCurrentPuzzle();
  assert.equal(noStorageCompletion.dialogOpen, true);
  assert.match(
    await evaluate('document.querySelector("#live-status").textContent'),
    /could not be saved/i,
  );

  const errors = JSON.parse(await runBrowser('errors', '--json'));
  assert.equal(errors.success, true);
  assert.deepEqual(errors.data.errors, []);
  console.log('Gameplay browser regression passed.');
} finally {
  try {
    await runBrowser('close');
  } catch {
    // The browser may not have opened when setup fails.
  }
  await new Promise((resolve) => server.close(resolve));
}
