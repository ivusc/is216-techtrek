import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { SKILL_ALIASES as CLIENT_ALIASES } from '../../client/src/utils/skills.js';

const require = createRequire(import.meta.url);
const {
  MAX_SKILLS,
  SKILL_ALIASES,
  cleanSkills,
  canonicalSkill,
  sameSkill,
} = require('../service/skills');

describe('canonicalSkill', () => {
  it.each([
    ['vue', 'Vue.js'],
    ['VueJS', 'Vue.js'],
    ['Vue.js', 'Vue.js'],
    ['node-js', 'Node.js'],
    ['UX / UI', 'UI/UX'],
    ['machine_learning', 'Machine Learning'],
    ['  postgres  ', 'SQL'],
  ])('%s -> %s', (input, expected) => {
    expect(canonicalSkill(input)).toBe(expected);
  });

  it('keeps unknown skills as typed, with spaces tidied', () => {
    expect(canonicalSkill('  Rust   Embedded ')).toBe('Rust Embedded');
  });
});

describe('sameSkill', () => {
  it('matches across spellings and case', () => {
    expect(sameSkill('reactjs', 'React')).toBe(true);
    expect(sameSkill('Rust', 'rust')).toBe(true);
    expect(sameSkill('Java', 'JavaScript')).toBe(false);
  });
});

describe('cleanSkills', () => {
  it('returns [] for anything that is not an array', () => {
    expect(cleanSkills(undefined)).toEqual([]);
    expect(cleanSkills('vue')).toEqual([]);
  });

  it('canonicalises, drops blanks and removes duplicates in order', () => {
    expect(cleanSkills(['vue', '', '  ', 'Vue.js', 'js', 'JavaScript', 'Rust'])).toEqual([
      'Vue.js',
      'JavaScript',
      'Rust',
    ]);
  });

  it('cuts each skill to 40 characters', () => {
    expect(cleanSkills(['x'.repeat(50)])).toEqual(['x'.repeat(40)]);
  });

  it(`keeps at most ${MAX_SKILLS} skills`, () => {
    const many = Array.from({ length: MAX_SKILLS + 5 }, (_, i) => `Skill ${i}`);
    expect(cleanSkills(many)).toEqual(many.slice(0, MAX_SKILLS));
  });
});

describe('skill aliases', () => {
  it('match the client copy in client/src/utils/skills.js', () => {
    expect(CLIENT_ALIASES).toEqual(SKILL_ALIASES);
  });
});
