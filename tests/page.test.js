import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(testsDirectory);

test('static page exposes the required puzzle contract and local image', async () => {
  const html = await readFile(path.join(projectDirectory, 'index.html'), 'utf8');

  for (const id of [
    'puzzle',
    'start-button',
    'restart-button',
    'moves',
    'timer',
    'preview-image',
    'image-error',
    'completion-dialog',
    'final-moves',
    'final-time',
    'live-status',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }

  assert.match(html, /<script[^>]+type=["']module["'][^>]+src=["']\.\/src\/app\.js["']/);
  assert.match(html, /5×5/);
  assert.match(html, /non-commercial/i);
  assert.match(html, /Bluey.*(?:Ludo Studio|BBC Studios)|(?:Ludo Studio|BBC Studios).*Bluey/i);

  const image = await stat(path.join(projectDirectory, 'assets', 'bluey-puzzle.png'));
  assert.ok(image.size > 0, 'local puzzle image must be non-empty');
});
