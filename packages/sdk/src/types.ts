export type BucketCategory =
  | 'Tuition'
  | 'Utility'
  | 'Medical'
  | 'Groceries'
  | 'FreeCash';

export interface BucketInput {
  category: BucketCategory;
  amount: string; // stroops (i128 string)
  recipient: string; // per-bucket recipient (multi-recipient padala)
}

export interface BucketView {
  id: number;
  category: BucketCategory;
  amount: string;
  recipient: string;
  claimed: boolean;
  claimedBy?: string;
}

export interface PadalaView {
  id: string;
  sender: string;
  buckets: BucketView[];
  createdAt: number;
  /** 0 for one-off; the recurring schedule id that minted it otherwise. */
  recurringId: number;
}

export interface RecurringView {
  id: string;
  sender: string;
  template: { category: BucketCategory; amount: string; recipient: string }[];
  intervalSecs: number;
  nextRun: number;
  remaining: number;
  perRunTotal: string;
  prefunded: string;
  active: boolean;
}

export interface ReputationView {
  merchant: string;
  claims: number;
  /** Total claimed volume routed to this merchant, in stroops (7 dp). */
  volume: string;
  lastClaimAt: number;
}

export const CATEGORY_TO_NUM: Record<BucketCategory, number> = {
  Tuition: 0,
  Utility: 1,
  Medical: 2,
  Groceries: 3,
  FreeCash: 4,
};
