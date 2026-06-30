import { describe, expect, it } from 'vitest';
import { parseAsset } from './config';

describe('parseAsset', () => {
  it('treats "xlm" (any case) as XLM', () => {
    expect(parseAsset('xlm')).toBe('XLM');
    expect(parseAsset('XLM')).toBe('XLM');
    expect(parseAsset('Xlm')).toBe('XLM');
  });

  it('defaults everything else to USDC', () => {
    expect(parseAsset('usdc')).toBe('USDC');
    expect(parseAsset(null)).toBe('USDC');
    expect(parseAsset(undefined)).toBe('USDC');
    expect(parseAsset('')).toBe('USDC');
    expect(parseAsset('garbage')).toBe('USDC');
  });
});
