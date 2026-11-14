const SKILLS = [
  { id: 'letter', name: 'Letter sounds', short: 'Sound Match', icon: '🔤', color: '#167e74', priority: 2.5 },
  { id: 'initial', name: 'First sounds', short: 'Sound Safari', icon: '👂', color: '#ff8f70', priority: 1.8 },
  { id: 'blend', name: 'CVC blending', short: 'Blend-a-Bus', icon: '🚌', color: '#6757c8', priority: 1.8 },
  { id: 'spell', name: 'Simple spelling', short: 'Spell It', icon: '🧩', color: '#c94e85', priority: 2.2 },
  { id: 'tricky', name: 'Tricky words', short: 'Tricky Treasure', icon: '💎', color: '#b06b16', priority: 3 },
];

const make = (word, emoji, skill, focus, phonemes, rhyme = '', clue = '') => ({
  id: `${skill}-${word}`,
  word,
  emoji,
  skill,
  focus,
  phonemes,
  rhyme,
  clue,
});

const WORDS = [
  make('t', '🔤', 'letter', 't', ['t'], '', '_ap'),
  make('n', '🔤', 'letter', 'n', ['n'], '', '_et'),
  make('c', '🔤', 'letter', 'c', ['c'], '', '_at'),
  make('k', '🔤', 'letter', 'k', ['k'], '', '_it'),
  make('ck', '🔤', 'letter', 'ck', ['ck'], '', 'du_'),
  make('e', '🔤', 'letter', 'e', ['e'], '', 'b_d'),
  make('u', '🔤', 'letter', 'u', ['u'], '', 'c_p'),
  make('i', '🔤', 'letter', 'i', ['i'], '', 's_t'),
  make('sun', '☀️', 'initial', 's', ['s', 'u', 'n'], 'un'),
  make('moon', '🌙', 'initial', 'm', ['m', 'oo', 'n'], 'oon'),
  make('fish', '🐟', 'initial', 'f', ['f', 'i', 'sh'], 'ish'),
  make('bear', '🐻', 'initial', 'b', ['b', 'air'], 'air'),
  make('cat', '🐱', 'initial', 'c', ['c', 'a', 't'], 'at'),
  make('dog', '🐶', 'initial', 'd', ['d', 'o', 'g'], 'og'),
  make('pig', '🐷', 'initial', 'p', ['p', 'i', 'g'], 'ig'),
  make('van', '🚐', 'initial', 'v', ['v', 'a', 'n'], 'an'),
  make('hat', '🎩', 'blend', 'a', ['h', 'a', 't'], 'at'),
  make('map', '🗺️', 'blend', 'a', ['m', 'a', 'p'], 'ap'),
  make('jam', '🍓', 'blend', 'a', ['j', 'a', 'm'], 'am'),
  make('bed', '🛏️', 'blend', 'e', ['b', 'e', 'd'], 'ed'),
  make('hen', '🐔', 'blend', 'e', ['h', 'e', 'n'], 'en'),
  make('web', '🕸️', 'blend', 'e', ['w', 'e', 'b'], 'eb'),
  make('sit', '🪑', 'blend', 'i', ['s', 'i', 't'], 'it'),
  make('zip', '🤐', 'blend', 'i', ['z', 'i', 'p'], 'ip'),
  make('fox', '🦊', 'blend', 'o', ['f', 'o', 'x'], 'ox'),
  make('log', '🪵', 'blend', 'o', ['l', 'o', 'g'], 'og'),
  make('bus', '🚌', 'blend', 'u', ['b', 'u', 's'], 'us'),
  make('cup', '🥤', 'blend', 'u', ['c', 'u', 'p'], 'up'),
  make('tap', '🚰', 'spell', 'a', ['t', 'a', 'p'], 'ap'),
  make('sit', '🪑', 'spell', 'i', ['s', 'i', 't'], 'it'),
  make('mad', '😠', 'spell', 'a', ['m', 'a', 'd'], 'ad'),
  make('net', '🥅', 'spell', 'e', ['n', 'e', 't'], 'et'),
  make('kit', '🧰', 'spell', 'i', ['k', 'i', 't'], 'it'),
  make('duck', '🦆', 'spell', 'u', ['d', 'u', 'ck'], 'uck'),
  make('ten', '🔟', 'spell', 'e', ['t', 'e', 'n'], 'en'),
  make('cup', '🥤', 'spell', 'u', ['c', 'u', 'p'], 'up'),
  make('to', '➡️', 'tricky', 'to', ['t', 'oo']),
  make('the', '👉', 'tricky', 'the', ['th', 'uh']),
  make('no', '🙅', 'tricky', 'no', ['n', 'oh']),
  make('go', '🏃', 'tricky', 'go', ['g', 'oh']),
  make('I', '🙋', 'tricky', 'I', ['eye']),
  make('ship', '🚢', 'digraph', 'sh', ['sh', 'i', 'p'], 'ip'),
  make('shop', '🏪', 'digraph', 'sh', ['sh', 'o', 'p'], 'op'),
  make('chin', '🙂', 'digraph', 'ch', ['ch', 'i', 'n'], 'in'),
  make('chop', '🔪', 'digraph', 'ch', ['ch', 'o', 'p'], 'op'),
  make('thumb', '👍', 'digraph', 'th', ['th', 'u', 'm'], 'um'),
  make('bath', '🛁', 'digraph', 'th', ['b', 'a', 'th'], 'ath'),
  make('duck', '🦆', 'digraph', 'ck', ['d', 'u', 'ck'], 'uck'),
  make('sock', '🧦', 'digraph', 'ck', ['s', 'o', 'ck'], 'ock'),
  make('ring', '💍', 'digraph', 'ng', ['r', 'i', 'ng'], 'ing'),
  make('king', '🤴', 'digraph', 'ng', ['k', 'i', 'ng'], 'ing'),
  make('bat', '🦇', 'rhyme', 'at', ['b', 'a', 't'], 'at'),
  make('rat', '🐀', 'rhyme', 'at', ['r', 'a', 't'], 'at'),
  make('frog', '🐸', 'rhyme', 'og', ['f', 'r', 'o', 'g'], 'og'),
  make('mug', '☕', 'rhyme', 'ug', ['m', 'u', 'g'], 'ug'),
  make('bug', '🐞', 'rhyme', 'ug', ['b', 'u', 'g'], 'ug'),
  make('pin', '📍', 'rhyme', 'in', ['p', 'i', 'n'], 'in'),
];

function createDefaultProgress() {
  return Object.fromEntries(SKILLS.map((skill) => [skill.id, { correct: 0, attempts: 0 }]));
}

function updateProgress(progress, skillId, correct) {
  const next = structuredClone(progress);
  next[skillId] ||= { correct: 0, attempts: 0 };
  next[skillId].attempts += 1;
  if (correct) next[skillId].correct += 1;
  return next;
}

function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function buildChoiceRound(answer, pool = WORDS, random = Math.random) {
  let candidates;
  if (answer.skill === 'rhyme') {
    const matching = pool.filter((item) => item.id !== answer.id && item.rhyme === answer.rhyme);
    const match = matching[0] || pool.find((item) => item.id !== answer.id && item.rhyme === answer.rhyme);
    const nonMatches = shuffle(pool.filter((item) => item.id !== answer.id && item.rhyme !== answer.rhyme), random).slice(0, 2);
    candidates = [match, ...nonMatches].filter(Boolean);
    return { answer, choices: shuffle(candidates, random), targetId: match?.id };
  }
  const distractors = shuffle(pool.filter((item) => {
    if (item.id === answer.id || item.skill !== answer.skill) return false;
    if (['initial', 'digraph'].includes(answer.skill)) return item.focus !== answer.focus;
    return true;
  }), random).slice(0, 2);
  candidates = [answer, ...distractors];
  return { answer, choices: shuffle(candidates, random), targetId: answer.id };
}

function skillWeight(skillId, progress) {
  const stats = progress[skillId] || { correct: 0, attempts: 0 };
  const assessmentPriority = SKILLS.find((skill) => skill.id === skillId)?.priority || 1;
  if (stats.attempts < 3) return 2 * assessmentPriority;
  return assessmentPriority + (1 - stats.correct / stats.attempts) * 4;
}

function buildSession(pool = WORDS, progress = createDefaultProgress(), length = 8, random = Math.random) {
  const skills = SKILLS.flatMap((skill) => Array(Math.ceil(skillWeight(skill.id, progress))).fill(skill.id));
  const chosenSkills = [];
  for (const skill of SKILLS) chosenSkills.push(skill.id);
  while (chosenSkills.length < length) chosenSkills.push(skills[Math.floor(random() * skills.length)]);
  const used = new Set();
  return shuffle(chosenSkills.slice(0, length), random).map((skillId) => {
    const options = shuffle(pool.filter((item) => item.skill === skillId && !used.has(item.id)), random);
    const answer = options[0] || shuffle(pool.filter((item) => item.skill === skillId), random)[0];
    used.add(answer.id);
    return buildChoiceRound(answer, pool, random);
  });
}

globalThis.PhonicsLearning = {
  SKILLS,
  WORDS,
  buildChoiceRound,
  buildSession,
  createDefaultProgress,
  updateProgress,
};
