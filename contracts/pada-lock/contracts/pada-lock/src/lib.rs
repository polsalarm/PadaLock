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

#[contracttype]
#[derive(Clone)]
pub struct BucketInput {
    pub category: u32,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct Bucket {
    pub id: u32,
    pub category: u32,
    pub amount: i128,
    pub claimed: bool,
    pub claimed_by: Option<Address>,
}

#[contracttype]
#[derive(Clone)]
pub struct Padala {
    pub sender: Address,
    pub recipient: Address,
    pub buckets: Vec<Bucket>,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    Counter,
    Padala(u64),
    Merchants(u32),
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
    }

    /// OFW creates a purpose-locked padala. Transfers total SAC from sender to contract.
    /// Returns padala id.
    pub fn create_padala(
        env: Env,
        sender: Address,
        recipient: Address,
        buckets: Vec<BucketInput>,
    ) -> u64 {
        sender.require_auth();

        if buckets.is_empty() {
            panic_with_error!(&env, Error::EmptyBuckets);
        }

        let token = Self::token(&env);
        let token_client = token::Client::new(&env, &token);

        let mut total: i128 = 0;
        let mut out = Vec::new(&env);
        for (i, b) in buckets.iter().enumerate() {
            if b.category > MAX_CATEGORY {
                panic_with_error!(&env, Error::InvalidCategory);
            }
            if b.amount <= 0 {
                panic_with_error!(&env, Error::InvalidAmount);
            }
            total += b.amount;
            out.push_back(Bucket {
                id: i as u32,
                category: b.category,
                amount: b.amount,
                claimed: false,
                claimed_by: None,
            });
        }

        token_client.transfer(&sender, &env.current_contract_address(), &total);

        let id: u64 = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::Counter)
            .unwrap_or(0)
            + 1;
        env.storage().instance().set(&DataKey::Counter, &id);

        let padala = Padala {
            sender: sender.clone(),
            recipient: recipient.clone(),
            buckets: out,
            created_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::Padala(id), &padala);

        env.events().publish(
            (Symbol::new(&env, "create"), sender, recipient),
            (id, total),
        );
        id
    }

    /// Recipient claims a bucket to a merchant. FreeCash bucket allows any merchant
    /// (typically a SEP-24 off-ramp account); restricted buckets require merchant
    /// to be in the whitelist for that category.
    pub fn claim(env: Env, padala_id: u64, bucket_id: u32, merchant: Address) -> i128 {
        let key = DataKey::Padala(padala_id);
        let mut padala: Padala = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, Error::PadalaNotFound));

        padala.recipient.require_auth();

        let mut bucket: Bucket = padala
            .buckets
            .get(bucket_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::BucketNotFound));

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
        padala.buckets.set(bucket_id, bucket);
        env.storage().persistent().set(&key, &padala);

        env.events().publish(
            (Symbol::new(&env, "claim"), padala.recipient.clone(), merchant),
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

    pub fn get_merchants(env: Env, category: u32) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Merchants(category))
            .unwrap_or(Vec::new(&env))
    }

    fn token(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
    }
}
