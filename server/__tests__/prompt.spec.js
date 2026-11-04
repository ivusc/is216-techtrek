import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { questionPrompt, feedbackPrompt } = require('../ai/prompt');

const ROLE = {
  organisation: 'Acme',
  title: 'Frontend Intern',
  type: 'internship',
  description: 'Build Vue apps.',
};

describe('questionPrompt', () => {
  it('names the role and asks for exactly 5 questions as JSON', () => {
    const prompt = questionPrompt(ROLE, []);

    expect(prompt).toContain('Generate exactly 5 interview questions');
    expect(prompt).toContain('Organisation: Acme');
    expect(prompt).toContain('Role: Frontend Intern');
    expect(prompt).toContain('Description: Build Vue apps.');
    expect(prompt).toContain('Return only a JSON array');
  });

  it('says None when there are no earlier questions, and lists them when there are', () => {
    expect(questionPrompt(ROLE, [])).toMatch(/previous questions:\s*None/);

    const prompt = questionPrompt(ROLE, ['Why Acme?', 'What is a closure?']);
    expect(prompt).toContain('Why Acme?');
    expect(prompt).toContain('What is a closure?');
    expect(prompt).not.toMatch(/previous questions:\s*None/);
  });

  it('copes with a missing description', () => {
    expect(questionPrompt({ ...ROLE, description: '' }, [])).toContain('Description: Not provided');
  });
});

describe('feedbackPrompt', () => {
  it('includes the role, question and answer, and the JSON fields FeedbackCard shows', () => {
    const prompt = feedbackPrompt(ROLE, 'Why Acme?', 'Because I like the product.');

    expect(prompt).toContain('Type: internship');
    expect(prompt).toContain('Interview Question:\nWhy Acme?');
    expect(prompt).toContain('Candidate Answer:\nBecause I like the product.');
    for (const field of [
      'score',
      'summary',
      'overallFeedback',
      'structure',
      'clarity',
      'relevance',
      'impact',
      'strengths',
      'improvements',
      'sampleAnswer',
    ]) {
      expect(prompt).toContain(`"${field}"`);
    }
  });

  it('copes with a missing description', () => {
    expect(feedbackPrompt({ ...ROLE, description: undefined }, 'Q', 'A')).toContain(
      'No description provided',
    );
  });
});
