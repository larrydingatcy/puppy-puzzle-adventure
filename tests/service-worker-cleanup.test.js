import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(testsDirectory);

test('legacy Phonics worker removes its caches, unregisters, and reloads open pages', async () => {
  const source = await readFile(path.join(projectDirectory, 'sw.js'), 'utf8');
  const listeners = new Map();
  const deletedCaches = [];
  const navigations = [];
  let skippedWaiting = 0;
  let unregistered = 0;

  const context = {
    caches: {
      async keys() {
        return ['phonics-picnic-v2', 'phonics-picnic-v3', 'another-site-v1'];
      },
      async delete(name) {
        deletedCaches.push(name);
        return true;
      },
    },
    self: {
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      async skipWaiting() {
        skippedWaiting += 1;
      },
      registration: {
        async unregister() {
          unregistered += 1;
          return true;
        },
      },
      clients: {
        async matchAll() {
          return [{
            url: 'https://example.test/puppy-puzzle-adventure/',
            async navigate(url) {
              navigations.push(url);
            },
          }];
        },
      },
    },
  };

  vm.runInNewContext(source, context);

  let installWork;
  listeners.get('install')({ waitUntil(work) { installWork = work; } });
  await installWork;

  let activateWork;
  listeners.get('activate')({ waitUntil(work) { activateWork = work; } });
  await activateWork;

  assert.equal(skippedWaiting, 1);
  assert.deepEqual(deletedCaches, ['phonics-picnic-v2', 'phonics-picnic-v3']);
  assert.equal(unregistered, 1);
  assert.deepEqual(navigations, ['https://example.test/puppy-puzzle-adventure/']);
  assert.equal(listeners.has('fetch'), false, 'cleanup worker must not intercept requests');
});
