import test from 'node:test';
import assert from 'node:assert/strict';
await import('../src/learning.js');

const {
  SKILLS,
  WORDS,
  phonemeFilesFor,
  buildChoiceRound,
  buildSession,
  createDefaultProgress,
  updateProgress,
} = globalThis.PhonicsLearning;

test('curriculum covers core early phonics skills', () => {
  assert.deepEqual(SKILLS.map((skill) => skill.id), ['letter', 'initial', 'blend', 'spell', 'tricky']);
  assert.ok(WORDS.filter((word) => word.skill === 'initial').length >= 8);
  assert.ok(WORDS.filter((word) => word.skill === 'blend').length >= 12);
  for (const sound of ['t', 'n', 'c', 'k', 'ck', 'e', 'u', 'i']) {
    assert.ok(WORDS.some((word) => word.skill === 'letter' && word.focus === sound), `missing priority sound ${sound}`);
  }
  assert.deepEqual(WORDS.filter((word) => word.skill === 'tricky').map((word) => word.word), ['to', 'the', 'no', 'go', 'I']);
});

test('choice rounds contain one answer and child-friendly distractors', () => {
  const answer = WORDS.find((word) => word.word === 'sun');
  const round = buildChoiceRound(answer, WORDS, () => 0.25);
  assert.equal(round.choices.length, 3);
  assert.equal(round.choices.filter((choice) => choice.id === answer.id).length, 1);
  assert.equal(new Set(round.choices.map((choice) => choice.id)).size, 3);
  const letters = WORDS.find((word) => word.id === 'letter-t');
  const letterRound = buildChoiceRound(letters, WORDS, () => 0.25);
  assert.equal(letterRound.choices.filter((choice) => choice.word === 't').length, 1);
});

test('sessions mix skills and favor weak areas', () => {
  const progress = createDefaultProgress();
  progress.initial = { correct: 20, attempts: 20 };
  progress.blend = { correct: 1, attempts: 8 };
  const session = buildSession(WORDS, progress, 10, () => 0.4);
  assert.equal(session.length, 10);
  assert.ok(session.filter((round) => round.answer.skill === 'blend').length >= 2);
  assert.equal(new Set(session.map((round) => round.answer.skill)).size, 5);
});

test('progress records attempts without negative scores', () => {
  const progress = createDefaultProgress();
  const right = updateProgress(progress, 'initial', true);
  const wrong = updateProgress(right, 'initial', false);
  assert.deepEqual(wrong.initial, { correct: 1, attempts: 2 });
  assert.deepEqual(progress.initial, { correct: 0, attempts: 0 });
});

test('priority letters use pure phonemes instead of spoken letter names', () => {
  assert.deepEqual(phonemeFilesFor('t'), ['t']);
  assert.deepEqual(phonemeFilesFor('n'), ['n']);
  assert.deepEqual(phonemeFilesFor('c'), ['k']);
  assert.deepEqual(phonemeFilesFor('k'), ['k']);
  assert.deepEqual(phonemeFilesFor('ck'), ['k']);
  assert.deepEqual(phonemeFilesFor('e'), ['e']);
  assert.deepEqual(phonemeFilesFor('u'), ['uh']);
  assert.deepEqual(phonemeFilesFor('i'), ['i']);
  assert.deepEqual(phonemeFilesFor('x'), ['k', 's']);
});

test('every recorded-sound question has an audio mapping', () => {
  const spoken = WORDS.filter((word) => ['letter', 'initial', 'blend'].includes(word.skill));
  for (const word of spoken) {
    const sounds = word.skill === 'blend' ? word.phonemes : [word.focus];
    for (const sound of sounds) {
      assert.ok(phonemeFilesFor(sound).length, `missing pure audio for /${sound}/ in ${word.word}`);
    }
  }
});
