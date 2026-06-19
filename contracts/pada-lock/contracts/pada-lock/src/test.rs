#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
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

fn bucket(_env: &Env, category: u32, amount: i128, recipient: &Address) -> BucketInput {
    BucketInput {
        category,
        amount,
        recipient: recipient.clone(),
    }
}

#[test]
fn create_and_get_padala() {
    let f = setup();

    let buckets = vec![
        &f.env,
        bucket(&f.env, TUITION, 100_0000000, &f.recipient),
        bucket(&f.env, FREE_CASH_CAT, 50_0000000, &f.recipient),
    ];

    let id = f.client.create_padala(&f.sender, &buckets);
    assert_eq!(id, 1);

    let p = f.client.get_padala(&id);
    assert_eq!(p.sender, f.sender);
    assert_eq!(p.recurring_id, 0);
    assert_eq!(p.buckets.len(), 2);
    assert_eq!(p.buckets.get(0).unwrap().amount, 100_0000000);
    assert_eq!(p.buckets.get(0).unwrap().recipient, f.recipient);
    assert_eq!(p.buckets.get(1).unwrap().category, FREE_CASH_CAT);
    assert_eq!(f.token_client.balance(&f.contract_id), 150_0000000);
}

#[test]
fn multi_recipient_padala() {
    let f = setup();
    let recipient_b = Address::generate(&f.env);

    let buckets = vec![
        &f.env,
        bucket(&f.env, TUITION, 100_0000000, &f.recipient),
        bucket(&f.env, FREE_CASH_CAT, 40_0000000, &recipient_b),
    ];
    let id = f.client.create_padala(&f.sender, &buckets);

    let p = f.client.get_padala(&id);
    assert_eq!(p.buckets.get(0).unwrap().recipient, f.recipient);
    assert_eq!(p.buckets.get(1).unwrap().recipient, recipient_b);

    // Second recipient off-ramps their own free-cash bucket.
    let off_ramp = Address::generate(&f.env);
    let paid = f.client.claim(&id, &1, &off_ramp);
    assert_eq!(paid, 40_0000000);
    assert_eq!(f.token_client.balance(&off_ramp), 40_0000000);
}

#[test]
fn claim_restricted_to_whitelisted_merchant() {
    let f = setup();
    f.client.add_merchant(&TUITION, &f.school);

    let buckets = vec![&f.env, bucket(&f.env, TUITION, 200_0000000, &f.recipient)];
    let id = f.client.create_padala(&f.sender, &buckets);

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

    let buckets = vec![&f.env, bucket(&f.env, FREE_CASH_CAT, 75_0000000, &f.recipient)];
    let id = f.client.create_padala(&f.sender, &buckets);

    let paid = f.client.claim(&id, &0, &off_ramp);
    assert_eq!(paid, 75_0000000);
    assert_eq!(f.token_client.balance(&off_ramp), 75_0000000);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn restricted_bucket_rejects_non_whitelisted_merchant() {
    let f = setup();
    let rando = Address::generate(&f.env);

    let buckets = vec![&f.env, bucket(&f.env, TUITION, 100_0000000, &f.recipient)];
    let id = f.client.create_padala(&f.sender, &buckets);

    f.client.claim(&id, &0, &rando);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn double_claim_reverts() {
    let f = setup();
    f.client.add_merchant(&TUITION, &f.school);

    let buckets = vec![&f.env, bucket(&f.env, TUITION, 100_0000000, &f.recipient)];
    let id = f.client.create_padala(&f.sender, &buckets);

    f.client.claim(&id, &0, &f.school);
    f.client.claim(&id, &0, &f.school);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn empty_buckets_revert() {
    let f = setup();
    let buckets: Vec<BucketInput> = vec![&f.env];
    f.client.create_padala(&f.sender, &buckets);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn invalid_category_reverts() {
    let f = setup();
    let buckets = vec![&f.env, bucket(&f.env, 99, 1_0000000, &f.recipient)];
    f.client.create_padala(&f.sender, &buckets);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn zero_amount_reverts() {
    let f = setup();
    let buckets = vec![&f.env, bucket(&f.env, TUITION, 0, &f.recipient)];
    f.client.create_padala(&f.sender, &buckets);
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

/* ───────── Recurring ───────── */

#[test]
fn recurring_prefunds_and_runs() {
    let f = setup();
    let template = vec![
        &f.env,
        bucket(&f.env, TUITION, 100_0000000, &f.recipient),
        bucket(&f.env, FREE_CASH_CAT, 50_0000000, &f.recipient),
    ];
    // 3 monthly occurrences, total 150 * 3 = 450 escrowed up front.
    let rec_id = f.client.create_recurring(&f.sender, &template, &2_592_000u64, &3u32);
    assert_eq!(rec_id, 1);
    assert_eq!(f.token_client.balance(&f.contract_id), 450_0000000);

    let rec = f.client.get_recurring(&rec_id);
    assert_eq!(rec.remaining, 3);
    assert!(rec.active);

    // First run due immediately.
    let p1 = f.client.execute_due(&rec_id);
    assert_eq!(p1, 1);
    let padala = f.client.get_padala(&p1);
    assert_eq!(padala.recurring_id, rec_id);
    assert_eq!(padala.buckets.len(), 2);

    let rec = f.client.get_recurring(&rec_id);
    assert_eq!(rec.remaining, 2);
    assert_eq!(rec.prefunded, 300_0000000);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn execute_before_due_reverts() {
    let f = setup();
    let template = vec![&f.env, bucket(&f.env, FREE_CASH_CAT, 10_0000000, &f.recipient)];
    let rec_id = f.client.create_recurring(&f.sender, &template, &2_592_000u64, &2u32);

    // First run consumes the immediate slot.
    f.client.execute_due(&rec_id);
    // Second run is one interval out — not yet due.
    f.client.execute_due(&rec_id);
}

#[test]
fn execute_after_interval_advances() {
    let f = setup();
    let template = vec![&f.env, bucket(&f.env, FREE_CASH_CAT, 10_0000000, &f.recipient)];
    let rec_id = f.client.create_recurring(&f.sender, &template, &100u64, &2u32);

    f.client.execute_due(&rec_id); // run 1 (now)
    f.env.ledger().set_timestamp(f.env.ledger().timestamp() + 100);
    let p2 = f.client.execute_due(&rec_id); // run 2 after interval
    assert_eq!(p2, 2);

    let rec = f.client.get_recurring(&rec_id);
    assert_eq!(rec.remaining, 0);
    assert!(!rec.active);
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn execute_exhausted_reverts() {
    let f = setup();
    let template = vec![&f.env, bucket(&f.env, FREE_CASH_CAT, 10_0000000, &f.recipient)];
    let rec_id = f.client.create_recurring(&f.sender, &template, &100u64, &1u32);

    f.client.execute_due(&rec_id); // exhausts the single occurrence
    f.client.execute_due(&rec_id); // nothing left -> NotActive
}

#[test]
fn cancel_refunds_remaining() {
    let f = setup();
    let template = vec![&f.env, bucket(&f.env, FREE_CASH_CAT, 10_0000000, &f.recipient)];
    let rec_id = f.client.create_recurring(&f.sender, &template, &100u64, &3u32);
    let after_fund = f.token_client.balance(&f.sender);

    f.client.execute_due(&rec_id); // spend one run (10)
    f.client.cancel_recurring(&rec_id); // refund remaining 20

    let rec = f.client.get_recurring(&rec_id);
    assert!(!rec.active);
    assert_eq!(rec.prefunded, 0);
    // Sender got back 20 of the 30 escrowed.
    assert_eq!(f.token_client.balance(&f.sender), after_fund + 20_0000000);
}
