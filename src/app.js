(() => {
const {
  SKILLS,
  WORDS,
  buildChoiceRound,
  buildSession,
  createDefaultProgress,
  updateProgress,
} = globalThis.PhonicsLearning;

const STORAGE_KEY = 'phonics-picnic-v1';
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

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function playCheer(kind = 'answer') {
  if (!state.sound) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audioContext ||= new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume();
  const notes = kind === 'finish' ? [523, 659, 784, 1047, 1319] : [659, 784, 988, 1319];
  const now = audioContext.currentTime;
  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = index % 2 ? 'triangle' : 'sine';
    gain.gain.setValueAtTime(.0001, now + index * .09);
    gain.gain.exponentialRampToValueAtTime(.085, now + index * .09 + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, now + index * .09 + .18);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now + index * .09);
    oscillator.stop(now + index * .09 + .2);
  });
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ||= new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function updateSoundButton() {
  $('#sound-toggle').setAttribute('aria-pressed', String(state.sound));
  $('#sound-toggle span').textContent = state.sound ? '🎉' : '🔕';
  $('#sound-toggle b').textContent = state.sound ? 'Cheer on' : 'Cheer off';
}

function showScreen(id) {
  $$('.screen').forEach((screen) => screen.classList.toggle('is-active', screen.id === id));
  $$('.bottom-nav button').forEach((button) => button.classList.toggle('is-current', button.dataset.go === id));
  $('.bottom-nav').hidden = ['game-screen', 'result-screen'].includes(id);
  if (id === 'map-screen') renderMap();
  if (id === 'grownups-screen') renderGrownups();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startGame(skillId = null) {
  getAudioContext();
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
  if (answer.skill === 'letter') return `Fill the gap: <em>${answer.clue}</em>`;
  if (answer.skill === 'initial') return `Which word begins with <em>${answer.focus}</em>?`;
  if (answer.skill === 'blend') return `Read each part.<br><em>${answer.phonemes.join(' · ')}</em>`;
  if (answer.skill === 'spell') return `Which word matches <em>${answer.emoji}</em>?`;
  if (answer.skill === 'tricky') return `Tap the tricky word <em>${answer.word}</em>.`;
  if (answer.skill === 'digraph') return `Which word has <em>${answer.focus}</em>?`;
  return `What rhymes with <em>${answer.word}</em>?`;
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
  $('#guide-line').textContent = round.answer.skill === 'blend' ? 'Read left to right, then say it fast!' : 'Look carefully and choose!';
  $('#round-count').textContent = `${roundIndex + 1} / ${session.length}`;
  $('#progress-dots').innerHTML = session.map((_, index) => `<i class="${index < roundIndex ? 'is-done' : ''}"></i>`).join('');
  $('#feedback').textContent = '';
  $('#sound-train').hidden = round.answer.skill !== 'blend';
  $('#sound-train').innerHTML = round.answer.phonemes.map((sound, index) => `${index ? '<i>+</i>' : ''}<span>${sound}</span>`).join('');
  $('#choices').replaceChildren();
  round.choices.forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `choice ${['letter', 'tricky'].includes(round.answer.skill) ? 'text-choice' : ''}`;
    button.innerHTML = `<span class="picture" role="img" aria-label="${choice.word}">${choice.emoji}</span><span class="word">${choice.word}</span>`;
    button.addEventListener('click', () => answer(button, choice.id === round.targetId, choice));
    $('#choices').append(button);
  });
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
    $('#guide-line').textContent = 'Good try. Look once more!';
    $('#feedback').textContent = round.answer.skill === 'blend'
      ? 'Read each part from left to right.'
      : 'Check the letters and try again.';
    return;
  }
  locked = true;
  button.classList.add('is-right');
  $$('#choices button').forEach((item) => { item.disabled = true; });
  if (!missedThisRound) correctFirstTry += 1;
  playCheer();
  $('#guide-line').textContent = ['You got it!', 'Super reading!', 'Word star!', 'Brilliant!'][roundIndex % 4];
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
  playCheer('finish');
  $('#result-copy').textContent = correctFirstTry === session.length
    ? 'Every word landed perfectly. Brilliant reading!'
    : `You solved ${session.length} phonics puzzles and kept trying.`;
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
    letter: 'Write short words with one gap, such as _ap or c_p, and let your child choose the missing letter.',
    initial: 'Write three short words and circle the one that begins with the target letter.',
    blend: 'Point to each written sound from left to right, then sweep your finger across the whole word.',
    spell: 'Show a picture, then choose the matching word from three written options.',
    tricky: 'Put to, the, no, go and I on five cards, name one, then race to find it.',
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
