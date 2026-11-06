import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(testsDirectory);

test('GitHub Pages workflow tests and publishes the repository root', async () => {
  const workflow = await readFile(
    path.join(projectDirectory, '.github', 'workflows', 'pages.yml'),
    'utf8',
  );

  assert.match(workflow, /on:\s*\n\s+push:\s*\n\s+branches:\s*\[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /run:\s*npm test/);
  assert.match(workflow, /uses:\s*actions\/configure-pages@v\d+/);
  assert.match(workflow, /uses:\s*actions\/upload-pages-artifact@v\d+[\s\S]*?with:\s*\n\s+path:\s*\./);
  assert.match(workflow, /uses:\s*actions\/deploy-pages@v\d+/);
  assert.match(workflow, /environment:\s*\n\s+name:\s*github-pages\s*\n\s+url:\s*\$\{\{\s*steps\.deployment\.outputs\.page_url\s*\}\}/);
});

test('public files and tracked asset names contain no legacy brand references', async () => {
  const publicFiles = ['index.html', 'src/app.js', 'styles.css', 'README.md'];
  const contents = await Promise.all(
    publicFiles.map((file) => readFile(path.join(projectDirectory, file), 'utf8')),
  );
  const trackedAssets = execFileSync('git', ['ls-files', 'assets'], {
    cwd: projectDirectory,
    encoding: 'utf8',
  });

  for (const [index, content] of contents.entries()) {
    assert.doesNotMatch(content, /Bluey|Ludo Studio|BBC Studios/i, publicFiles[index]);
  }
  assert.doesNotMatch(trackedAssets, /Bluey|Ludo Studio|BBC Studios/i);
});
