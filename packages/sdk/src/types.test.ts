import { describe, expect, it } from 'vitest';
import { CATEGORY_TO_NUM, type BucketCategory } from './types';

describe('CATEGORY_TO_NUM', () => {
  const categories: BucketCategory[] = [
    'Tuition',
    'Utility',
    'Medical',
    'Groceries',
    'FreeCash',
  ];

  it('maps every category to a contract enum value', () => {
    for (const c of categories) {
      expect(typeof CATEGORY_TO_NUM[c]).toBe('number');
    }
  });

  it('matches the contract category ordering (0..4)', () => {
    expect(CATEGORY_TO_NUM.Tuition).toBe(0);
    expect(CATEGORY_TO_NUM.Utility).toBe(1);
    expect(CATEGORY_TO_NUM.Medical).toBe(2);
    expect(CATEGORY_TO_NUM.Groceries).toBe(3);
    expect(CATEGORY_TO_NUM.FreeCash).toBe(4);
  });

  it('assigns a unique number to each category', () => {
    const nums = categories.map((c) => CATEGORY_TO_NUM[c]);
    expect(new Set(nums).size).toBe(categories.length);
  });

  it('treats FreeCash as the only unrestricted category (highest index)', () => {
    const max = Math.max(...categories.map((c) => CATEGORY_TO_NUM[c]));
    expect(CATEGORY_TO_NUM.FreeCash).toBe(max);
  });
});
