import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';

const port = 8001;
const url = `http://127.0.0.1:${port}`;
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
