export type BucketCategory =
  | 'Tuition'
  | 'Utility'
  | 'Medical'
  | 'Groceries'
  | 'FreeCash';

export interface BucketInput {
  category: BucketCategory;
  amount: string; // stroops (i128 string)
}

export interface BucketView {
  id: number;
  category: BucketCategory;
  amount: string;
  claimed: boolean;
  claimedBy?: string;
}

export interface PadalaView {
  id: string;
  sender: string;
  recipient: string;
  buckets: BucketView[];
  createdAt: number;
}

export const CATEGORY_TO_NUM: Record<BucketCategory, number> = {
  Tuition: 0,
  Utility: 1,
  Medical: 2,
  Groceries: 3,
  FreeCash: 4,
};
