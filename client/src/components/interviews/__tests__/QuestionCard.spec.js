import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import QuestionCard from '@/components/interviews/QuestionCard.vue';

describe('QuestionCard', () => {
  it('shows the question with its type and difficulty', () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: {
          type: 'Behavioural',
          difficulty: 'Medium',
          question: 'Tell me about a time you failed.',
        },
      },
    });

    expect(wrapper.find('h2').text()).toBe('Tell me about a time you failed.');
    expect(wrapper.find('.type-tag').text()).toBe('Behavioural');
    expect(wrapper.find('.difficulty-tag').text()).toBe('Medium');
  });
});
