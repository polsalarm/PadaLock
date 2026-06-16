# Starter Prompts

Ready-to-use prompts and context blocks for starting a Stellar project with Claude Code during **StellarX Philippines**. Copy, fill in the blanks, and paste into your first session.

---

## 1. The Wallet vs. App Distinction

This is one of the most important ambiguities to remove at the start of a Stellar build session.

If you say:
> Build me a Stellar wallet

Claude may default to a **dApp pattern**:
- connect an external browser wallet
- build UI around that connection
- sign transactions with an injected extension

That is **not** the same thing as a self-custodial wallet.

### If you want a self-custodial wallet, say it explicitly

**Bad**
> Build me a Stellar wallet for payments in the Philippines.

**Better**
> Build a self-custodial browser wallet for Stellar. No browser extension required. Users create an account with a password. The app generates and stores its own mnemonic locally. The password derives an encryption key, which encrypts the mnemonic before storing it. On login, the password decrypts the mnemonic in memory. All transaction signing happens locally. Do not use Freighter, xBull, or any external signer.

The better version gives Claude the architecture.  
The vague version leaves Claude free to choose the most common pattern in its training data.

### If you are building an app, say that explicitly too

**Example**
> Build a payment app on Stellar, not a wallet product. The user may connect an external wallet, but the core product is a payment flow, not wallet infrastructure.

This matters a lot during StellarX Philippines because many teams are building:
- wallets
- payment apps
- remittance tools
- savings or DeFi products

These are different product categories and should be described differently.

---

## 2. Protocol Context Block

Paste this at the top of your first Claude Code message in any StellarX Philippines session and fill in the project-specific blanks.

```text
Context for this project:
- Stellar SDK: @stellar/stellar-sdk v14. Use the `rpc` namespace, not `SorobanRpc`.
  Use `new rpc.Server(url)` and `rpc.assembleTransaction()`.
- Network: [testnet | mainnet]
- RPC URL: [your RPC endpoint]
- Wallet architecture: [self-custodial wallet | app with external wallet connection | no wallet, server-side flow]
- Product type: [wallet | payment app | remittance flow | DeFi interface | savings app | other]
- Primary user flow: [describe the one main flow you are building]
- Target market context: Philippines. Optimize for real financial utility, simple UX, and demo-ready execution.
- Use meaningful Stellar integration. Do not add unnecessary complexity.
- [Add project-specific notes: asset assumptions, protocol assumptions, anchor assumptions, vault addresses, contract IDs, etc.]
```

### Optional stronger version

Use this if you want to lock in more architecture upfront:

```text
Context for this project:
- Stellar SDK: @stellar/stellar-sdk v14. Use the `rpc` namespace, not `SorobanRpc`.
- Network: [testnet | mainnet]
- RPC URL: [your RPC endpoint]
- Framework: [Next.js | React | SvelteKit | other]
- Package manager: [npm | pnpm | bun]
- Product type: [wallet | payment app | remittance app | DeFi app | savings product]
- Wallet pattern: [self-custodial | external wallet connect | none]
- Main goal: build the smallest strong demo-ready version of the core flow
- Avoid overbuilding. Prioritize the main user journey over edge features.
- Philippines context: the product should feel relevant to local payments, remittance, savings, or financial access where applicable.
- [Add any project-specific integration constraints]
```

---

## 3. Prompt Patterns by Project Type

### A. Self-custodial wallet prompt

```text
Build a self-custodial browser wallet on Stellar. No browser extension required. Users create an account with a password. The app generates its own mnemonic locally, encrypts it with the user's password, and stores only the encrypted secret locally. On login, decrypt the mnemonic in memory and sign all transactions locally. Do not use Freighter, xBull, or any injected wallet. Focus on the smallest strong flow first: create wallet, fund on testnet, view balance, and perform one send/payment action.
```

---

### B. Payment app prompt

```text
Build a payment app on Stellar for a Philippines use case. This is not a wallet product. The main goal is a clean payment flow with a simple UI and a demo-ready transaction path. Use a connected wallet only if needed, but do not build extra wallet infrastructure unless explicitly necessary. Focus on the core flow: user intent, payment action, transaction confirmation, and result display.
```

---

### C. Remittance app prompt

```text
Build a remittance-focused Stellar app with a Philippines context. The product should show a clean flow for moving value across a corridor or between sender and receiver states. Keep the scope tight and optimize for demo clarity. Do not add extra dashboard features unless they are needed for the core flow. Focus on quote, send, receive, and transaction result visibility.
```

---

### D. DeFi product prompt

```text
Build a Stellar DeFi app focused on one clear use case: [swaps | savings | lending | yield]. Do not try to support every protocol or every asset. Focus on a single strong product flow with clear state, balance visibility, transaction progress, and result confirmation. Keep the code modular and testable.
```

---

## 4. Parallel Agent Prompt Pattern

Use this once you already have a working scaffold and want Claude to parallelize the rest of the build.

```text
The scaffold is in place. Use plan mode to divide the remaining work into three independent tracks:

Track 1: Core logic and tests
- [list the pure logic modules]
- Write Vitest unit tests for each module as you go

Track 2: State management and routing
- [list the stores, state singletons, and routing logic]
- No UI components; just state and navigation logic

Track 3: UI components
- [list the pages and components]
- Use the stores from Track 2; do not duplicate state

After the plan is approved, spawn one agent per track and run them in parallel.
Once all three are done, spawn a fourth agent to do integration: wire the UI to the stores, the stores to the core logic, and run the full test suite.
```

### When to use this
Use this when:
- the project structure is already stable
- tasks are reasonably independent
- you want to move faster on implementation
- you are no longer making basic architecture choices

---

## 5. `CLAUDE.md` Template for a StellarX Philippines Project

Create a `CLAUDE.md` file at the root of your repo with content like this. Claude Code reads it automatically at session startup.

```markdown
# Project context

## Tech stack
- Framework: [Next.js | React | SvelteKit | other]
- Stellar SDK: @stellar/stellar-sdk v14
- Network: [testnet | mainnet]
- Package manager: [npm | pnpm | bun]

## Product
- Product type: [wallet | payment app | remittance app | DeFi interface | savings app]
- Primary user flow: [describe in one sentence]
- Philippines relevance: [describe briefly if applicable]

## Stellar configuration
- Network passphrase: [Networks.TESTNET | Networks.PUBLIC]
- RPC URL: [your RPC endpoint]
- Asset assumptions: [issuer / contract / token assumptions if any]

## Wallet architecture
[Delete if not relevant]
- Wallet type: [self-custodial | external wallet connection]
- Signing pattern: [local signing | connected wallet signing]
- Storage approach: [local encrypted mnemonic | session key | other]

## Project-specific gotchas
- [List important constraints Claude must remember]
- [List integration assumptions]
- [List testnet addresses or contract IDs if needed]

## Testing
- Framework: [Vitest | other]
- Focus on testing the core flow first
```

The point of `CLAUDE.md` is to stop re-explaining the same project context every session.

---

## 6. Useful “Start This Project” Prompt

If you want one strong generic starting prompt for StellarX Philippines, use this:

```text
Use plan mode first.

I am building a Stellar project for StellarX Philippines.

Project type: [wallet | payment app | remittance app | DeFi app | savings product]
Main user flow: [describe it in one sentence]
Wallet pattern: [self-custodial | external wallet | none]
Framework: [your framework]
Network: [testnet | mainnet]

I want the smallest strong demo-ready version of this product first.
Do not overbuild. Do not add unnecessary features.
First:
1. define the architecture
2. define the minimum demo scope
3. propose the file structure
4. identify any missing assumptions or risks
Only after that, start implementation.
```

---

## 7. Quick Corrective Prompts

These are useful when Claude starts going in the wrong direction.

### Wrong product type
```text
Stop. You are building the wrong kind of product. This is a [wallet / payment app / remittance app / DeFi app], not [the wrong type]. Reframe the architecture around the correct product type.
```

### Wrong wallet pattern
```text
Stop. I do not want an app that depends on an injected browser wallet. I want a self-custodial wallet that manages its own keys locally.
```

### Overbuilding
```text
This is too much scope. Reduce it to the smallest strong demo-ready flow and remove non-essential features.
```

### Wrong SDK namespace
```text
You are using the old SorobanRpc namespace. In v14, use `rpc`. Replace old namespace usage with the correct v14 pattern.
```

### Missing transaction polling
```text
Do not assume sendTransaction means success. Add proper polling for final transaction status and surface progress cleanly in the UI.
```

### Weak test coverage
```text
Add tests for the core logic and transaction-related flows before continuing with secondary features.
```

---

## 8. Final Advice

Use prompts to lock in the architecture early.

The strongest StellarX Philippines projects usually come from teams that:
- define the product clearly
- make the wallet/app distinction early
- keep scope tight
- optimize for the core demo
- use Claude to accelerate execution, not replace judgment

A well-scoped prompt can save hours of rebuilding later.
