import { describe, expect, it } from 'vitest';
import {
  fmtStroops,
  toStroops,
  usdcToPhp,
  phpToUsdcHuman,
  PHP_PER_USDC,
} from './balance';

describe('stroops <-> human USDC', () => {
  it('toStroops scales by 7 decimals', () => {
    expect(toStroops('1')).toBe('10000000');
    expect(toStroops('0.5')).toBe('5000000');
    expect(toStroops('123.4567890')).toBe('1234567890');
  });

  it('toStroops truncates beyond 7 decimals', () => {
    expect(toStroops('1.123456789')).toBe('11234567');
  });

  it('toStroops handles empty / integer input', () => {
    expect(toStroops('0')).toBe('0');
    expect(toStroops('')).toBe('0');
    expect(toStroops('20000')).toBe('200000000000');
  });

  it('fmtStroops renders 2 fractional digits', () => {
    expect(fmtStroops('10000000')).toBe('1.00');
    expect(fmtStroops('5000000')).toBe('0.50');
    expect(fmtStroops('0')).toBe('0.00');
  });

  it('fmtStroops <- toStroops roundtrips at 2dp precision', () => {
    expect(fmtStroops(toStroops('42.50'))).toBe('42.50');
    expect(fmtStroops(toStroops('1000.00'))).toBe('1000.00');
  });
});

describe('USDC <-> PHP display rate', () => {
  it('usdcToPhp multiplies by the fixed rate', () => {
    expect(usdcToPhp(1)).toBe(`${PHP_PER_USDC}.00`);
    expect(usdcToPhp('10')).toBe((10 * PHP_PER_USDC).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }));
  });

  it('usdcToPhp guards NaN', () => {
    expect(usdcToPhp('not-a-number')).toBe('0.00');
  });

  it('phpToUsdcHuman is the inverse of the rate', () => {
    expect(phpToUsdcHuman(PHP_PER_USDC)).toBe(1);
    expect(phpToUsdcHuman('0')).toBe(0);
    expect(phpToUsdcHuman('garbage')).toBe(0);
  });
});
