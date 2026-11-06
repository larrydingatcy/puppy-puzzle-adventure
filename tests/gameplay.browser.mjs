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
