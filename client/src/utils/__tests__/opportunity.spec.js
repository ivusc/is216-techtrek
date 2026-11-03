import { describe, expect, it } from 'vitest';
import { getPrizeAmount } from '@/utils/opportunity';

describe('getPrizeAmount', () => {
  it.each([
    ['$10,000 in prizes', 10000],
    ['1st: $500', 500],
    ['21st place: $300', 300],
    ['$5k', 5],
    ['SGD500', 500],
    ['€2,500', 2500],
    ['Swag', 0],
    [undefined, 0],
  ])('%j is worth %j', (prize, amount) => {
    expect(getPrizeAmount({ prize })).toBe(amount);
  });
});
