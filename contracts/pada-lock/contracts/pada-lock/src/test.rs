#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    vec, Address, Env,
};

const TUITION: u32 = 0;
const UTILITY: u32 = 1;
const FREE_CASH_CAT: u32 = 4;

struct Fixture<'a> {
    env: Env,
    #[allow(dead_code)]
    admin: Address,
    sender: Address,
    recipient: Address,
    school: Address,
    contract_id: Address,
    client: PadaLockClient<'a>,
    token_client: TokenClient<'a>,
    #[allow(dead_code)]
    token_admin: StellarAssetClient<'a>,
}

fn setup<'a>() -> Fixture<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let school = Address::generate(&env);

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();
    let token_client = TokenClient::new(&env, &token_addr);
    let token_admin = StellarAssetClient::new(&env, &token_addr);

    // Mint to sender (7 decimals).
    token_admin.mint(&sender, &10_000_0000_0000i128);

    let contract_id = env.register(PadaLock, (admin.clone(), token_addr.clone()));
    let client = PadaLockClient::new(&env, &contract_id);

    Fixture {
        env,
        admin,
        sender,
        recipient,
        school,
        contract_id,
        client,
        token_client,
        token_admin,
    }
}

#[test]
fn create_and_get_padala() {
    let f = setup();

    let buckets = vec![
        &f.env,
        BucketInput { category: TUITION, amount: 100_0000000 },
        BucketInput { category: FREE_CASH_CAT, amount: 50_0000000 },
    ];

    let id = f.client.create_padala(&f.sender, &f.recipient, &buckets);
    assert_eq!(id, 1);

    let p = f.client.get_padala(&id);
    assert_eq!(p.sender, f.sender);
    assert_eq!(p.recipient, f.recipient);
    assert_eq!(p.buckets.len(), 2);
    assert_eq!(p.buckets.get(0).unwrap().amount, 100_0000000);
    assert_eq!(p.buckets.get(1).unwrap().category, FREE_CASH_CAT);
    assert_eq!(f.token_client.balance(&f.contract_id), 150_0000000);
}

#[test]
fn claim_restricted_to_whitelisted_merchant() {
    let f = setup();
    f.client.add_merchant(&TUITION, &f.school);

    let buckets = vec![&f.env, BucketInput { category: TUITION, amount: 200_0000000 }];
    let id = f.client.create_padala(&f.sender, &f.recipient, &buckets);

    let paid = f.client.claim(&id, &0, &f.school);
    assert_eq!(paid, 200_0000000);
    assert_eq!(f.token_client.balance(&f.school), 200_0000000);

    let p = f.client.get_padala(&id);
    assert!(p.buckets.get(0).unwrap().claimed);
}

#[test]
fn claim_free_cash_to_any_merchant() {
    let f = setup();
    let off_ramp = Address::generate(&f.env);

    let buckets = vec![&f.env, BucketInput { category: FREE_CASH_CAT, amount: 75_0000000 }];
    let id = f.client.create_padala(&f.sender, &f.recipient, &buckets);

    let paid = f.client.claim(&id, &0, &off_ramp);
    assert_eq!(paid, 75_0000000);
    assert_eq!(f.token_client.balance(&off_ramp), 75_0000000);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn restricted_bucket_rejects_non_whitelisted_merchant() {
    let f = setup();
    let rando = Address::generate(&f.env);

    let buckets = vec![&f.env, BucketInput { category: TUITION, amount: 100_0000000 }];
    let id = f.client.create_padala(&f.sender, &f.recipient, &buckets);

    f.client.claim(&id, &0, &rando);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn double_claim_reverts() {
    let f = setup();
    f.client.add_merchant(&TUITION, &f.school);

    let buckets = vec![&f.env, BucketInput { category: TUITION, amount: 100_0000000 }];
    let id = f.client.create_padala(&f.sender, &f.recipient, &buckets);

    f.client.claim(&id, &0, &f.school);
    f.client.claim(&id, &0, &f.school);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn empty_buckets_revert() {
    let f = setup();
    let buckets: Vec<BucketInput> = vec![&f.env];
    f.client.create_padala(&f.sender, &f.recipient, &buckets);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn invalid_category_reverts() {
    let f = setup();
    let buckets = vec![&f.env, BucketInput { category: 99, amount: 1_0000000 }];
    f.client.create_padala(&f.sender, &f.recipient, &buckets);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn zero_amount_reverts() {
    let f = setup();
    let buckets = vec![&f.env, BucketInput { category: TUITION, amount: 0 }];
    f.client.create_padala(&f.sender, &f.recipient, &buckets);
}

#[test]
fn add_merchant_appends() {
    let f = setup();
    let m1 = Address::generate(&f.env);
    let m2 = Address::generate(&f.env);
    f.client.add_merchant(&UTILITY, &m1);
    f.client.add_merchant(&UTILITY, &m2);

    let list = f.client.get_merchants(&UTILITY);
    assert_eq!(list.len(), 2);
    assert_eq!(list.get(0).unwrap(), m1);
    assert_eq!(list.get(1).unwrap(), m2);
}
