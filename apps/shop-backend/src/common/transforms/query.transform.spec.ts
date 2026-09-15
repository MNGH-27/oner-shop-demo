import { parseBooleanQuery } from './query.transform';

describe('parseBooleanQuery', () => {
  const transform = (value: unknown) =>
    parseBooleanQuery({ value } as Parameters<typeof parseBooleanQuery>[0]);

  it('preserves false instead of converting the string to true', () => {
    expect(transform('false')).toBe(false);
    expect(transform('true')).toBe(true);
  });

  it('leaves invalid input for the validator to reject', () => {
    expect(transform('yes')).toBe('yes');
  });
});
