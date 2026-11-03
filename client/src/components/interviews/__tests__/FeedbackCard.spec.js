import { describe, expect, it } from 'vitest';
import { RouterLinkStub, mount } from '@vue/test-utils';
import FeedbackCard from '@/components/interviews/FeedbackCard.vue';

const FEEDBACK = {
  score: 7,
  summary: 'Clear, needs a result.',
  overallFeedback: 'Good structure, no numbers.',
  structure: 8,
  clarity: 6,
  relevance: 9,
  impact: 4,
  strengths: ['Clear situation', 'Specific actions'],
  improvements: ['Quantify the result', 'Link it to the role'],
  sampleAnswer: 'I rebuilt the search page and cut load time to one second.',
};

function mountCard(props) {
  return mount(FeedbackCard, {
    props: { feedback: FEEDBACK, ...props },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('FeedbackCard', () => {
  it('lists the score, strengths and improvements', () => {
    const wrapper = mountCard();

    expect(wrapper.get('.score-number').text()).toBe('7');
    expect(wrapper.get('.score-summary').text()).toContain('Clear, needs a result.');
    expect(wrapper.get('.score-summary').text()).toContain('Good structure, no numbers.');
    expect(
      wrapper
        .findAll('.score-row')
        .map((row) => [row.get('span').text(), row.get('strong').text()]),
    ).toEqual([
      ['Structure', '8'],
      ['Clarity', '6'],
      ['Relevance', '9'],
      ['Impact', '4'],
    ]);
    expect(wrapper.findAll('.score-fill').map((fill) => fill.attributes('style'))).toEqual([
      'width: 80%;',
      'width: 60%;',
      'width: 90%;',
      'width: 40%;',
    ]);
    const [strengths, improvements] = wrapper.findAll('.feedback-section');
    expect(strengths.findAll('li').map((item) => item.text())).toEqual([
      '✓Clear situation',
      '✓Specific actions',
    ]);
    expect(improvements.findAll('li').map((item) => item.text())).toEqual([
      '!Quantify the result',
      '!Link it to the role',
    ]);
    expect(wrapper.get('.sample-answer').text()).toContain(FEEDBACK.sampleAnswer);
  });

  it('offers Next, or Back to Applications on the last question', async () => {
    const middle = mountCard({ isLastQuestion: false });

    expect(middle.findComponent(RouterLinkStub).exists()).toBe(false);
    await middle.get('button').trigger('click');
    expect(middle.emitted('next')).toHaveLength(1);

    const last = mountCard({ isLastQuestion: true });

    expect(last.find('button').exists()).toBe(false);
    expect(last.getComponent(RouterLinkStub).props('to')).toBe('/interview');
    expect(last.getComponent(RouterLinkStub).text()).toBe('Back to Applications');
  });
});
