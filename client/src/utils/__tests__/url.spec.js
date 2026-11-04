import { describe, expect, it } from 'vitest';
import { safeHttpUrl } from '@/utils/url';

describe('safeHttpUrl', () => {
  it.each([
    ['https://github.com/kelliej', 'https://github.com/kelliej'],
    ['javascript:alert(1)', null],
    ['http://github.com/kelliej', null],
    ['github.com/kelliej', null],
    ['', null],
    [undefined, null],
  ])('%j gives %j', (value, expected) => {
    expect(safeHttpUrl(value)).toBe(expected);
  });
});
