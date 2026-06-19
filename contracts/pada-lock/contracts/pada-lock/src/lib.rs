#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, token, Address, Env,
    Symbol, Vec,
};

mod test;

/// Purpose-locked padala buckets.
/// Category numeric mapping is mirrored in the TS SDK (`CATEGORY_TO_NUM`).
/// 0=Tuition 1=Utility 2=Medical 3=Groceries 4=FreeCash
const FREE_CASH: u32 = 4;
const MAX_CATEGORY: u32 = 4;

/// Each bucket carries its own recipient, so one padala can fan out to several
/// family members (multi-recipient). Single-recipient is the common case where
/// every bucket shares the same address.
#[contracttype]
#[derive(Clone)]
pub struct BucketInput {
    pub category: u32,
    pub amount: i128,
    pub recipient: Address,
}

#[contracttype]
#[derive(Clone)]
pub struct Bucket {
    pub id: u32,
    pub category: u32,
    pub amount: i128,
    pub recipient: Address,
    pub claimed: bool,
    pub claimed_by: Option<Address>,
}

#[contracttype]
#[derive(Clone)]
pub struct Padala {
    pub sender: Address,
    pub buckets: Vec<Bucket>,
    pub created_at: u64,
    /// 0 for a one-off padala; the recurring schedule id that minted it otherwise.
    pub recurring_id: u64,
}

/// A prefunded recurring schedule. The sender deposits `occurrences` worth of the
/// template up front; anyone may call `execute_due` once each interval elapses,
/// which mints a fresh Padala from the already-escrowed funds (no per-run sender
/// signature needed — the whole point of "recurring").
#[contracttype]
#[derive(Clone)]
pub struct Recurring {
    pub sender: Address,
    pub template: Vec<BucketInput>,
    pub interval_secs: u64,
    pub next_run: u64,
    pub remaining: u32,
    pub per_run_total: i128,
    pub prefunded: i128,
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    Counter,
    Padala(u64),
    Merchants(u32),
    RecCounter,
    Recurring(u64),
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    Unauthorized = 2,
    PadalaNotFound = 3,
    BucketNotFound = 4,
    AlreadyClaimed = 5,
    MerchantNotWhitelisted = 6,
    InvalidCategory = 7,
    InvalidAmount = 8,
    EmptyBuckets = 9,
    RecurringNotFound = 10,
    NotDue = 11,
    NotActive = 12,
    InvalidInterval = 13,
    InvalidOccurrences = 14,
}

#[contract]
pub struct PadaLock;

#[contractimpl]
impl PadaLock {
    /// Initializer. Called once after deploy.
    pub fn __constructor(env: Env, admin: Address, token: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Counter, &0u64);
        env.storage().instance().set(&DataKey::RecCounter, &0u64);
    }

    /// OFW creates a purpose-locked padala. Transfers total SAC from sender to
    /// contract. Each bucket names its own recipient. Returns padala id.
    pub fn create_padala(env: Env, sender: Address, buckets: Vec<BucketInput>) -> u64 {
        sender.require_auth();

        let total = Self::sum_and_validate(&env, &buckets);

        let token = Self::token(&env);
        token::Client::new(&env, &token).transfer(
            &sender,
            &env.current_contract_address(),
            &total,
        );

        let id = Self::mint_padala(&env, &sender, &buckets, 0);
        env.events()
            .publish((Symbol::new(&env, "create"), sender), (id, total));
        id
    }

    /// OFW sets up a prefunded recurring padala. Deposits `occurrences * total`
    /// up front; first run is due immediately. Returns the schedule id.
    pub fn create_recurring(
        env: Env,
        sender: Address,
        template: Vec<BucketInput>,
        interval_secs: u64,
        occurrences: u32,
    ) -> u64 {
        sender.require_auth();

        if interval_secs == 0 {
            panic_with_error!(&env, Error::InvalidInterval);
        }
        if occurrences == 0 {
            panic_with_error!(&env, Error::InvalidOccurrences);
        }

        let per_run_total = Self::sum_and_validate(&env, &template);
        let prefunded = per_run_total * (occurrences as i128);

        let token = Self::token(&env);
        token::Client::new(&env, &token).transfer(
            &sender,
            &env.current_contract_address(),
            &prefunded,
        );

        let rec_id: u64 = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::RecCounter)
            .unwrap_or(0)
            + 1;
        env.storage().instance().set(&DataKey::RecCounter, &rec_id);

        let rec = Recurring {
            sender: sender.clone(),
            template,
            interval_secs,
            next_run: env.ledger().timestamp(), // first run due now
            remaining: occurrences,
            per_run_total,
            prefunded,
            active: true,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Recurring(rec_id), &rec);

        env.events().publish(
            (Symbol::new(&env, "rec_new"), sender),
            (rec_id, prefunded, occurrences),
        );
        rec_id
    }

    /// Trigger the next run of a recurring schedule. Permissionless: callable by
    /// anyone (a cron, the family, the sender) once `next_run` has elapsed. Mints
    /// a Padala from the already-escrowed prefund. Returns the new padala id.
    pub fn execute_due(env: Env, rec_id: u64) -> u64 {
        let key = DataKey::Recurring(rec_id);
        let mut rec: Recurring = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, Error::RecurringNotFound));

        if !rec.active || rec.remaining == 0 {
            panic_with_error!(&env, Error::NotActive);
        }
        if env.ledger().timestamp() < rec.next_run {
            panic_with_error!(&env, Error::NotDue);
        }

        let id = Self::mint_padala(&env, &rec.sender, &rec.template, rec_id);

        rec.remaining -= 1;
        rec.prefunded -= rec.per_run_total;
        rec.next_run += rec.interval_secs;
        if rec.remaining == 0 {
            rec.active = false;
        }
        env.storage().persistent().set(&key, &rec);

        env.events().publish(
            (Symbol::new(&env, "rec_run"), rec.sender.clone()),
            (rec_id, id, rec.remaining),
        );
        id
    }

    /// Sender cancels a recurring schedule and is refunded the unspent prefund.
    pub fn cancel_recurring(env: Env, rec_id: u64) {
        let key = DataKey::Recurring(rec_id);
        let mut rec: Recurring = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, Error::RecurringNotFound));
        rec.sender.require_auth();

        if !rec.active {
            panic_with_error!(&env, Error::NotActive);
        }

        if rec.prefunded > 0 {
            let token = Self::token(&env);
            token::Client::new(&env, &token).transfer(
                &env.current_contract_address(),
                &rec.sender,
                &rec.prefunded,
            );
        }
        rec.active = false;
        rec.prefunded = 0;
        rec.remaining = 0;
        env.storage().persistent().set(&key, &rec);

        env.events()
            .publish((Symbol::new(&env, "rec_cancel"), rec.sender.clone()), rec_id);
    }

    /// Recipient claims a bucket to a merchant. FreeCash allows any merchant
    /// (typically the recipient's own wallet, then a SEP-24 off-ramp); restricted
    /// buckets require the merchant to be whitelisted for that category.
    pub fn claim(env: Env, padala_id: u64, bucket_id: u32, merchant: Address) -> i128 {
        let key = DataKey::Padala(padala_id);
        let mut padala: Padala = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, Error::PadalaNotFound));

        let mut bucket: Bucket = padala
            .buckets
            .get(bucket_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::BucketNotFound));

        // Per-bucket recipient authorizes its own claim (multi-recipient).
        bucket.recipient.require_auth();

        if bucket.claimed {
            panic_with_error!(&env, Error::AlreadyClaimed);
        }

        if bucket.category != FREE_CASH {
            let merchants: Vec<Address> = env
                .storage()
                .persistent()
                .get(&DataKey::Merchants(bucket.category))
                .unwrap_or(Vec::new(&env));
            let mut whitelisted = false;
            for m in merchants.iter() {
                if m == merchant {
                    whitelisted = true;
                    break;
                }
            }
            if !whitelisted {
                panic_with_error!(&env, Error::MerchantNotWhitelisted);
            }
        }

        let token = Self::token(&env);
        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &merchant,
            &bucket.amount,
        );

        bucket.claimed = true;
        bucket.claimed_by = Some(merchant.clone());
        let amount = bucket.amount;
        let recipient = bucket.recipient.clone();
        padala.buckets.set(bucket_id, bucket);
        env.storage().persistent().set(&key, &padala);

        env.events().publish(
            (Symbol::new(&env, "claim"), recipient, merchant),
            (padala_id, bucket_id, amount),
        );
        amount
    }

    /// Admin-only: whitelist a merchant under a restricted category.
    pub fn add_merchant(env: Env, category: u32, merchant: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));
        admin.require_auth();

        if category > MAX_CATEGORY {
            panic_with_error!(&env, Error::InvalidCategory);
        }

        let mut merchants: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Merchants(category))
            .unwrap_or(Vec::new(&env));
        merchants.push_back(merchant);
        env.storage()
            .persistent()
            .set(&DataKey::Merchants(category), &merchants);
    }

    pub fn get_padala(env: Env, padala_id: u64) -> Padala {
        env.storage()
            .persistent()
            .get(&DataKey::Padala(padala_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::PadalaNotFound))
    }

    pub fn get_recurring(env: Env, rec_id: u64) -> Recurring {
        env.storage()
            .persistent()
            .get(&DataKey::Recurring(rec_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::RecurringNotFound))
    }

    pub fn get_merchants(env: Env, category: u32) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Merchants(category))
            .unwrap_or(Vec::new(&env))
    }

    /// Validate buckets and return their total. Shared by one-off + recurring.
    fn sum_and_validate(env: &Env, buckets: &Vec<BucketInput>) -> i128 {
        if buckets.is_empty() {
            panic_with_error!(env, Error::EmptyBuckets);
        }
        let mut total: i128 = 0;
        for b in buckets.iter() {
            if b.category > MAX_CATEGORY {
                panic_with_error!(env, Error::InvalidCategory);
            }
            if b.amount <= 0 {
                panic_with_error!(env, Error::InvalidAmount);
            }
            total += b.amount;
        }
        total
    }

    /// Build + store a Padala from a (pre-validated, pre-funded) bucket set.
    /// Does NOT move tokens — callers handle funding (create_padala transfers;
    /// execute_due spends the recurring prefund).
    fn mint_padala(
        env: &Env,
        sender: &Address,
        buckets: &Vec<BucketInput>,
        recurring_id: u64,
    ) -> u64 {
        let mut out = Vec::new(env);
        for (i, b) in buckets.iter().enumerate() {
            out.push_back(Bucket {
                id: i as u32,
                category: b.category,
                amount: b.amount,
                recipient: b.recipient.clone(),
                claimed: false,
                claimed_by: None,
            });
        }

        let id: u64 = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::Counter)
            .unwrap_or(0)
            + 1;
        env.storage().instance().set(&DataKey::Counter, &id);

        let padala = Padala {
            sender: sender.clone(),
            buckets: out,
            created_at: env.ledger().timestamp(),
            recurring_id,
        };
        env.storage().persistent().set(&DataKey::Padala(id), &padala);
        id
    }

    fn token(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
    }
}
