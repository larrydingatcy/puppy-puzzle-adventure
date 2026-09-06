import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const port = 8001;
const url = `http://127.0.0.1:${port}`;
const uploadFixture = fileURLToPath(new URL('./fixtures/upload-test.svg', import.meta.url));
const runBrowser = (...args) => execFileSync('agent-browser', args, { encoding: 'utf8' });
const evaluate = (expression) => JSON.parse(runBrowser('eval', expression));

function waitForServer() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 5_000;

    function attempt() {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error('Static server did not start.'));
          return;
        }
        setTimeout(attempt, 50);
      });
    }

    attempt();
  });
}

const server = spawn('python3', ['-m', 'http.server', String(port)], {
  stdio: 'ignore',
});

try {
  await once(server, 'spawn');
  await waitForServer();

  runBrowser('open', url);
  runBrowser('wait', '--load', 'networkidle');

  runBrowser('press', 'Tab');
  assert.equal(evaluate('document.activeElement.id'), 'start-button');
  runBrowser('press', 'Enter');

  runBrowser('press', 'Tab');
  runBrowser('press', 'Tab');
  assert.equal(evaluate('document.activeElement.id'), 'upload-button');
  runBrowser('press', 'Tab');
  const firstIndex = evaluate('document.activeElement.dataset.index');
  const firstPosition = Number(firstIndex) + 1;
  assert.match(evaluate('document.activeElement.className'), /puzzle-piece/);

  runBrowser('press', 'Enter');
  assert.equal(
    evaluate('document.activeElement.dataset.index'),
    firstIndex,
    'the selected puzzle piece keeps keyboard focus',
  );
  assert.match(evaluate('document.querySelector("#live-status").textContent'), new RegExp(`Position ${firstPosition} selected`));

  runBrowser('press', 'Enter');
  assert.equal(evaluate('document.querySelector("#live-status").textContent'), 'Selection cleared.');

  runBrowser('press', 'Enter');
  runBrowser('press', 'Tab');
  const secondIndex = evaluate('document.activeElement.dataset.index');
  assert.notEqual(secondIndex, firstIndex);
  runBrowser('press', 'Space');
  assert.equal(evaluate('document.querySelector("#moves").textContent'), '1');
  assert.match(evaluate('document.querySelector("#live-status").textContent'), /^Pieces swapped\. 1 moves\.$/);

  runBrowser('upload', '#image-upload', uploadFixture);
  runBrowser('wait', '500');
  assert.deepEqual(
    evaluate(`({
      source: document.querySelector('#preview-image').src.startsWith('blob:'),
      pieces: document.querySelectorAll('.puzzle-piece').length,
      moves: document.querySelector('#moves').textContent,
      ratio: Number.parseFloat(document.querySelector('#puzzle').style.aspectRatio),
    })`),
    { source: true, pieces: 25, moves: '0', ratio: 1.5 },
    'uploading a valid image starts a fresh puzzle and preserves its aspect ratio',
  );
  console.log('Keyboard-only browser regression passed.');
} finally {
  try {
    runBrowser('close');
  } catch {
    // The browser may not have opened when setup fails.
  }
  server.kill();
  await once(server, 'exit');
}
