import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('page exposes a touch-friendly phonics journey', async () => {
  const [html, app] = await Promise.all([
    readFile(path.join(root, 'index.html'), 'utf8'),
    readFile(path.join(root, 'src/app.js'), 'utf8'),
  ]);
  for (const id of ['home-screen', 'game-screen', 'map-screen', 'grownups-screen', 'result-screen']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
  assert.match(html, /Phonics Picnic/);
  assert.match(html, /Sound Safari/);
  assert.match(html, /Blend-a-Bus/);
  assert.match(html, /Sound Match/);
  assert.match(html, /Spell & Treasure/);
  assert.match(html, /to, the, no, go and I/);
  assert.match(html, /Cheer on/);
  assert.doesNotMatch(html, /listen-button/);
  assert.doesNotMatch(html, /Pure phoneme recordings/);
  assert.doesNotMatch(app, /speechSynthesis|SpeechSynthesisUtterance|raw\.githubusercontent|playPhonemes/);
  assert.match(app, /playCheer/);
  assert.match(html, /id=["']sound-toggle["']/);
  assert.match(html, /defer src=["']\.\/src\/learning\.js\?v=\d+["']/);
  assert.match(html, /defer src=["']\.\/src\/app\.js\?v=\d+["']/);
  assert.doesNotMatch(html, /type=["']module["']/);
});

test('the game remains installable and offline-ready', async () => {
  const [html, manifest, worker] = await Promise.all([
    readFile(path.join(root, 'index.html'), 'utf8'),
    readFile(path.join(root, 'manifest.webmanifest'), 'utf8'),
    readFile(path.join(root, 'sw.js'), 'utf8'),
  ]);
  assert.match(html, /manifest\.webmanifest/);
  assert.equal(JSON.parse(manifest).display, 'standalone');
  assert.match(worker, /src\/learning\.js/);
  assert.match(worker, /phonics-picnic-v4/);
  assert.match(worker, /self\.skipWaiting/);
  assert.match(worker, /self\.clients\.claim/);
});
