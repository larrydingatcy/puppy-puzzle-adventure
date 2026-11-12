import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

class FakeClassList {
  constructor(names = []) { this.names = new Set(names); }
  add(name) { this.names.add(name); }
  remove(name) { this.names.delete(name); }
  contains(name) { return this.names.has(name); }
  toggle(name, enabled) {
    if (enabled === undefined ? !this.names.has(name) : enabled) this.names.add(name);
    else this.names.delete(name);
  }
}

class FakeElement {
  constructor(id = '', classes = []) {
    this.id = id;
    this.dataset = {};
    this.classList = new FakeClassList(classes);
    this.style = { setProperty() {} };
    this.children = [];
    this.listeners = {};
    this.parts = {};
    this.hidden = false;
    this.textContent = '';
    this.innerHTML = '';
  }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  click() { this.onclick?.(); this.listeners.click?.(); }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this[name] = value; }
  querySelector(selector) { return this.parts[selector] ||= new FakeElement(); }
}

function createBrowser() {
  const ids = [
    'start-button', 'play-again', 'sound-toggle', 'reset-progress', 'skill-label',
    'prompt-title', 'guide-face', 'guide-line', 'round-count', 'progress-dots',
    'feedback', 'sound-train', 'listen-button', 'choices', 'skill-map',
    'skill-stats', 'parent-tip-copy', 'result-copy', 'sound-badges',
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
  const screens = ['home-screen', 'game-screen', 'map-screen', 'grownups-screen', 'result-screen']
    .map((id, index) => new FakeElement(id, index === 0 ? ['screen', 'is-active'] : ['screen']));
  const bottomNav = new FakeElement('', ['bottom-nav']);
  const gameCard = new FakeElement('', ['game-card']);
  const goButtons = ['home-screen', 'map-screen', 'grownups-screen'].map((destination) => {
    const button = new FakeElement();
    button.dataset.go = destination;
    return button;
  });

  const document = {
    querySelector(selector) {
      if (selector.startsWith('#') && !selector.includes(' ')) return elements[selector.slice(1)];
      if (selector.startsWith('#') && selector.includes(' ')) {
        const [id, part] = selector.split(' ');
        return elements[id.slice(1)].querySelector(part);
      }
      if (selector === '.bottom-nav') return bottomNav;
      if (selector === '.game-card') return gameCard;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.screen') return screens;
      if (selector === '.bottom-nav button' || selector === '[data-go]') return goButtons;
      if (selector === '#choices button') return elements.choices.children;
      return [];
    },
    createElement() { return new FakeElement(); },
  };

  const storage = new Map();
  const browser = {
    console,
    structuredClone,
    document,
    navigator: {},
    location: { protocol: 'file:' },
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); },
    },
    confirm: () => true,
    scrollTo() {},
    addEventListener() {},
    setTimeout: () => 0,
    clearTimeout() {},
  };
  browser.window = browser;
  browser.globalThis = browser;
  return { browser, elements, screens, goButtons };
}

test('classic browser scripts load together and every main page is interactive', async () => {
  const [learning, app] = await Promise.all([
    readFile(path.join(root, 'src/learning.js'), 'utf8'),
    readFile(path.join(root, 'src/app.js'), 'utf8'),
  ]);
  const { browser, elements, screens, goButtons } = createBrowser();
  const context = vm.createContext(browser);

  vm.runInContext(learning, context, { filename: 'learning.js' });
  vm.runInContext(app, context, { filename: 'app.js' });

  elements['start-button'].click();
  assert.ok(screens.find((screen) => screen.id === 'game-screen').classList.contains('is-active'));
  assert.equal(elements.choices.children.length, 3, 'Play should render three answer choices');

  goButtons.find((button) => button.dataset.go === 'map-screen').click();
  assert.ok(screens.find((screen) => screen.id === 'map-screen').classList.contains('is-active'));
  assert.match(elements['skill-map'].innerHTML, /Sound Match/);
  assert.match(elements['skill-map'].innerHTML, /Tricky Treasure/);

  goButtons.find((button) => button.dataset.go === 'grownups-screen').click();
  assert.ok(screens.find((screen) => screen.id === 'grownups-screen').classList.contains('is-active'));
  assert.match(elements['skill-stats'].innerHTML, /CVC blending/);
  assert.ok(elements['parent-tip-copy'].textContent);
});
