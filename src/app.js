(() => {
const {
  SKILLS,
  WORDS,
  buildChoiceRound,
  buildSession,
  createDefaultProgress,
  phonemeFilesFor,
  updateProgress,
} = globalThis.PhonicsLearning;

const STORAGE_KEY = 'phonics-picnic-v1';
const PURE_SOUND_AUDIO_ROOT = 'https://raw.githubusercontent.com/Nico-Sanchez/schwa/720907443ddd1811756dc4a73b686c774fc277d7/site/audio/';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadState() {
  const fallback = { progress: createDefaultProgress(), sessions: 0, sound: true };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return fallback;
    return {
      progress: { ...fallback.progress, ...saved.progress },
      sessions: Number(saved.sessions) || 0,
      sound: saved.sound !== false,
    };
  } catch {
    return fallback;
  }
}

let state = loadState();
let session = null;
let roundIndex = 0;
let correctFirstTry = 0;
let missedThisRound = false;
let locked = false;
let audioContext;
const pureSoundBuffers = new Map();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function playChime(kind = 'tap') {
  if (!state.sound) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audioContext ||= new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume();
  const notes = kind === 'right' ? [523, 659, 784] : kind === 'finish' ? [523, 659, 784, 1047] : [220, 196];
  const now = audioContext.currentTime;
  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = kind === 'wrong' ? 'triangle' : 'sine';
    gain.gain.setValueAtTime(.0001, now + index * .09);
    gain.gain.exponentialRampToValueAtTime(.07, now + index * .09 + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, now + index * .09 + .12);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now + index * .09);
    oscillator.stop(now + index * .09 + .14);
  });
}

function speak(text, options = {}) {
  if (!state.sound || !('speechSynthesis' in window)) return Promise.resolve();
  return new Promise((resolve) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = options.rate || .72;
    utterance.pitch = options.pitch || 1.08;
    const voice = speechSynthesis.getVoices().find((item) => /^en-GB/i.test(item.lang))
      || speechSynthesis.getVoices().find((item) => /^en/i.test(item.lang));
    if (voice) utterance.voice = voice;
    const button = $('#listen-button');
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      button?.classList.remove('is-speaking');
      resolve();
    };
    utterance.onstart = () => button?.classList.add('is-speaking');
    utterance.onend = finish;
    utterance.onerror = finish;
    speechSynthesis.speak(utterance);
    window.setTimeout(finish, Math.max(1800, text.length * 105));
  });
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ||= new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function loadPureSound(file) {
  if (!pureSoundBuffers.has(file)) {
    const context = getAudioContext();
    pureSoundBuffers.set(file, context
      ? fetch(`${PURE_SOUND_AUDIO_ROOT}${file}.mp3`)
        .then((response) => {
          if (!response.ok) throw new Error(`Could not load /${file}/`);
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes))
        .catch(() => null)
      : Promise.resolve(null));
  }
  return pureSoundBuffers.get(file);
}

async function playPhonemes(sounds, wholeWord = '') {
  if (!state.sound) return;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const context = getAudioContext();
  const files = sounds.flatMap(phonemeFilesFor);
  const buffers = (await Promise.all(files.map(loadPureSound))).filter(Boolean);
  if (!context || buffers.length !== files.length) {
    if (wholeWord) await speak(wholeWord);
    return;
  }
  let startAt = context.currentTime + .04;
  buffers.forEach((buffer) => {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(startAt);
    startAt += buffer.duration + .07;
  });
  await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, (startAt - context.currentTime) * 1000)));
  if (wholeWord) await speak(wholeWord, { rate: .64 });
}

function updateSoundButton() {
  $('#sound-toggle').setAttribute('aria-pressed', String(state.sound));
  $('#sound-toggle span').textContent = state.sound ? '🔊' : '🔇';
  $('#sound-toggle b').textContent = state.sound ? 'Sound on' : 'Sound off';
}

function showScreen(id) {
  $$('.screen').forEach((screen) => screen.classList.toggle('is-active', screen.id === id));
  $$('.bottom-nav button').forEach((button) => button.classList.toggle('is-current', button.dataset.go === id));
  $('.bottom-nav').hidden = ['game-screen', 'result-screen'].includes(id);
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (id === 'map-screen') renderMap();
  if (id === 'grownups-screen') renderGrownups();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startGame(skillId = null) {
  getAudioContext();
  ['t', 'n', 'c', 'k', 'ck', 'e', 'u', 'i', 'a', 'o', 's', 'm', 'p', 'd', 'f', 'b', 'g', 'h', 'r', 'l', 'v', 'w', 'z', 'sh', 'ch', 'th', 'ng']
    .flatMap(phonemeFilesFor)
    .forEach(loadPureSound);
  if (skillId) {
    const pool = WORDS.filter((word) => word.skill === skillId);
    session = Array.from({ length: 6 }, (_, index) => buildChoiceRound(pool[index % pool.length], WORDS));
  } else {
    session = buildSession(WORDS, state.progress, 8);
  }
  roundIndex = 0;
  correctFirstTry = 0;
  showScreen('game-screen');
  renderRound();
}

function skillFor(id) {
  return SKILLS.find((skill) => skill.id === id);
}

function promptFor(round) {
  const { answer } = round;
  if (answer.skill === 'letter') return `Which spelling makes <em>/${answer.focus}/</em>?`;
  if (answer.skill === 'initial') return `Which one starts with <em>/${answer.focus}/</em>?`;
  if (answer.skill === 'blend') return 'Push the sounds together.<br><em>What word?</em>';
  if (answer.skill === 'spell') return `Which word matches <em>${answer.emoji}</em>?`;
  if (answer.skill === 'tricky') return 'Listen. Find the <em>tricky word</em>.';
  if (answer.skill === 'digraph') return `Which word has <em>${answer.focus}</em>?`;
  return `What rhymes with <em>${answer.word}</em>?`;
}

async function playInstruction(round) {
  const { answer } = round;
  if (answer.skill === 'letter') {
    await speak('Listen. Find the spelling for this sound.');
    return playPhonemes([answer.focus]);
  }
  if (answer.skill === 'initial') {
    await speak('Listen. Which word starts with this sound?');
    return playPhonemes([answer.focus]);
  }
  if (answer.skill === 'digraph') {
    await speak('Listen. Which word has this sound?');
    return playPhonemes([answer.focus]);
  }
  if (answer.skill === 'blend') return playPhonemes(answer.phonemes, answer.word);
  if (answer.skill === 'tricky') return speak(`Find ${answer.word}. ${answer.word}.`);
  if (answer.skill === 'spell') return speak(`Find the word ${answer.word}.`);
  return speak(`Find a word that rhymes with ${answer.word}. ${answer.word}.`);
}

function renderRound() {
  const round = session[roundIndex];
  const skill = skillFor(round.answer.skill);
  missedThisRound = false;
  locked = false;
  $('.game-card').style.setProperty('--skill-color', skill.color);
  $('#skill-label').textContent = skill.short.toUpperCase();
  $('#prompt-title').innerHTML = promptFor(round);
  $('#guide-face').textContent = ['🐻', '🐰', '🦊', '🐼'][roundIndex % 4];
  $('#guide-line').textContent = round.answer.skill === 'blend' ? 'Slow sounds, then fast!' : 'Use your listening ears!';
  $('#round-count').textContent = `${roundIndex + 1} / ${session.length}`;
  $('#progress-dots').innerHTML = session.map((_, index) => `<i class="${index < roundIndex ? 'is-done' : ''}"></i>`).join('');
  $('#feedback').textContent = '';
  $('#sound-train').hidden = round.answer.skill !== 'blend';
  $('#sound-train').innerHTML = round.answer.phonemes.map((sound, index) => `${index ? '<i>+</i>' : ''}<span>${sound}</span>`).join('');
  $('#listen-button b').textContent = round.answer.skill === 'blend' ? 'Hear the sounds' : 'Hear the clue';
  $('#listen-button').onclick = () => playInstruction(round);
  $('#choices').replaceChildren();
  round.choices.forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `choice ${['letter', 'tricky'].includes(round.answer.skill) ? 'text-choice' : ''}`;
    button.innerHTML = `<span class="picture" role="img" aria-label="${choice.word}">${choice.emoji}</span><span class="word">${choice.word}</span>`;
    button.addEventListener('click', () => answer(button, choice.id === round.targetId, choice));
    $('#choices').append(button);
  });
  window.setTimeout(() => $('#listen-button').click(), 250);
}

function answer(button, correct, choice) {
  if (locked) return;
  const round = session[roundIndex];
  state.progress = updateProgress(state.progress, round.answer.skill, correct);
  save();
  if (!correct) {
    missedThisRound = true;
    button.classList.add('is-wrong');
    button.disabled = true;
    playChime('wrong');
    $('#guide-line').textContent = 'Good try. Listen once more!';
    $('#feedback').textContent = round.answer.skill === 'rhyme'
      ? `Listen to the ending: ${round.answer.rhyme}.`
      : `Try the ${round.answer.focus} sound again.`;
    window.setTimeout(() => $('#listen-button').click(), 350);
    return;
  }
  locked = true;
  button.classList.add('is-right');
  $$('#choices button').forEach((item) => { item.disabled = true; });
  if (!missedThisRound) correctFirstTry += 1;
  playChime('right');
  speak(`${choice.word}. Brilliant!`);
  $('#guide-line').textContent = ['You heard it!', 'Super blending!', 'Sound star!', 'You kept trying!'][roundIndex % 4];
  $('#feedback').textContent = round.answer.skill === 'blend'
    ? `${round.answer.phonemes.join(' · ')} → ${round.answer.word}`
    : `${choice.word}! That’s it.`;
  window.setTimeout(nextRound, 1150);
}

function nextRound() {
  roundIndex += 1;
  if (roundIndex < session.length) {
    renderRound();
    return;
  }
  state.sessions += 1;
  save();
  renderResult();
}

function renderResult() {
  playChime('finish');
  $('#result-copy').textContent = correctFirstTry === session.length
    ? 'Every sound landed perfectly. What listening!'
    : `You solved ${session.length} sound puzzles and kept trying.`;
  const focuses = [...new Set(session.map((round) => round.answer.focus))].slice(0, 7);
  $('#sound-badges').innerHTML = focuses.map((sound) => `<span>${sound}</span>`).join('');
  showScreen('result-screen');
}

function accuracy(skillId) {
  const stats = state.progress[skillId] || { correct: 0, attempts: 0 };
  return stats.attempts ? Math.round(stats.correct / stats.attempts * 100) : 0;
}

function renderMap() {
  $('#skill-map').innerHTML = SKILLS.map((skill) => {
    const score = accuracy(skill.id);
    const label = score ? `${score}% so far` : 'Ready to explore';
    return `<button class="map-stop" type="button" data-skill="${skill.id}" style="--stop-color:${skill.color}">
      <span class="map-icon">${skill.icon}</span><span><b>${skill.short}</b><small>${skill.name} · ${label}</small></span><span class="arrow">›</span>
      <span class="map-meter"><i style="width:${score}%"></i></span></button>`;
  }).join('');
  $$('.map-stop').forEach((button) => button.addEventListener('click', () => startGame(button.dataset.skill)));
}

function renderGrownups() {
  $('#skill-stats').innerHTML = SKILLS.map((skill) => {
    const stats = state.progress[skill.id];
    const score = accuracy(skill.id);
    const note = stats.attempts < 3 ? 'Not enough practice yet' : score >= 80 ? 'Becoming secure' : score >= 60 ? 'Keep practising' : 'Priority practice';
    return `<article class="stat-card" style="--stat-color:${skill.color}"><div class="stat-head"><b>${skill.icon} ${skill.name}</b><span>${stats.attempts ? `${score}%` : '—'}</span></div><p>${note} · ${stats.attempts} tries</p><div class="stat-meter"><i style="width:${score}%"></i></div></article>`;
  }).join('');
  const weakest = [...SKILLS].sort((a, b) => accuracy(a.id) - accuracy(b.id))[0];
  const tips = {
    letter: 'Use magnetic letters for t, n, c, k, ck, e, u and i. Say a sound and let your child choose the matching spelling.',
    initial: 'Pick three objects at home. Say their first sounds, then hunt for another object with the same sound.',
    blend: 'Stretch each sound with your fingers, then sweep your hand across to blend the whole word.',
    spell: 'Say a short word one sound at a time. Let your child write or choose one letter for each sound they hear.',
    tricky: 'Put to, the, no, go and I on five cards. Say one word, then race to tap the matching card.',
    digraph: 'Explain that two letters can be “best friends” making one sound. Spot sh, ch, th, ck and ng in books.',
    rhyme: 'Say a silly rhyme chain together: cat, hat, bat. Made-up words are welcome if they rhyme!',
  };
  $('#parent-tip-copy').textContent = tips[weakest.id];
}

$$('[data-go]').forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.go)));
$('#start-button').addEventListener('click', () => startGame());
$('#play-again').addEventListener('click', () => startGame());
$('#sound-toggle').addEventListener('click', () => { state.sound = !state.sound; save(); updateSoundButton(); });
$('#reset-progress').addEventListener('click', () => {
  if (!window.confirm('Reset all phonics progress?')) return;
  state = { progress: createDefaultProgress(), sessions: 0, sound: state.sound };
  save();
  renderGrownups();
});

updateSoundButton();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
})();
