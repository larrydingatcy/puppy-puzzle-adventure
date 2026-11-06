import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatElapsed, imageAspectRatio, isUsableImageFile } from '../src/app.js';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(testsDirectory);

test('formatElapsed formats elapsed milliseconds as total minutes and seconds', () => {
  assert.equal(formatElapsed(0), '00:00');
  assert.equal(formatElapsed(65_000), '01:05');
  assert.equal(formatElapsed(3_605_000), '60:05');
});

test('uploaded image files must have image content and non-empty bytes', () => {
  assert.equal(isUsableImageFile({ type: 'image/jpeg', size: 42 }), true);
  assert.equal(isUsableImageFile({ type: 'text/plain', size: 42 }), false);
  assert.equal(isUsableImageFile({ type: 'image/png', size: 0 }), false);
  assert.equal(isUsableImageFile(null), false);
});

test('image aspect ratio preserves valid dimensions and falls back safely', () => {
  assert.equal(imageAspectRatio(600, 400), 1.5);
  assert.equal(imageAspectRatio(0, 400), 16 / 9);
  assert.equal(imageAspectRatio(600, Number.NaN), 16 / 9);
});

test('static page exposes the required puzzle contract and local image', async () => {
  const html = await readFile(path.join(projectDirectory, 'index.html'), 'utf8');
  const readme = await readFile(path.join(projectDirectory, 'README.md'), 'utf8');
  const app = await readFile(path.join(projectDirectory, 'src', 'app.js'), 'utf8');

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
    'upload-button',
    'image-upload',
    'difficulty-controls',
    'difficulty-5',
    'difficulty-7',
    'difficulty-9',
    'current-difficulty',
    'best-moves',
    'best-time',
    'replay-button',
    'next-difficulty-button',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }

  assert.match(html, /<script[^>]+type=["']module["'][^>]+src=["']\.\/src\/app\.js["']/);
  assert.match(
    html,
    /<link\b(?=[^>]*\brel\s*=\s*["']icon["'])(?=[^>]*\bhref\s*=\s*["']data:,["'])[^>]*>/i,
    'page must avoid a missing favicon request',
  );
  assert.match(html, /Puppy Puzzle Adventure/);
  for (const size of [5, 7, 9]) {
    assert.match(
      html,
      new RegExp(`<button[^>]+id=["']difficulty-${size}["'][^>]+aria-pressed=["'](?:true|false)["']`, 'i'),
      `difficulty ${size} must be a pressed-state button`,
    );
  }
  assert.match(html, /<input[^>]+id=["']image-upload["'][^>]+type=["']file["'][^>]+accept=["']image\/\*["']/i);
  assert.match(html, /stays on (?:your )?device|never leaves (?:your )?(?:browser|device)/i);
  assert.match(app, /\.\/assets\/puppy-puzzle\.png/);

  for (const [name, contents] of [['index.html', html], ['README.md', readme], ['src/app.js', app]]) {
    assert.doesNotMatch(contents, /Bluey|Ludo Studio|BBC Studios/i, `${name} must use original branding`);
  }

  const image = await stat(path.join(projectDirectory, 'assets', 'puppy-puzzle.png'));
  assert.ok(image.size > 0, 'local puzzle image must be non-empty');
});
