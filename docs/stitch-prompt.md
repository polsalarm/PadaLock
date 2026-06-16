# Google Stitch Prompt — PadaLock

> Paste the block below into [stitch.withgoogle.com](https://stitch.withgoogle.com). Pick **Mobile** mode. Generate.

---

## COPY FROM HERE ↓

Design a mobile-first PWA called **PadaLock** — a purpose-locked remittance app for Filipino OFWs (overseas workers) sending money home to family in the Philippines. The product splits a single padala (remittance) into purpose buckets: Tuition, Utility, Medical, Groceries, Free Cash. Restricted buckets release only to whitelisted merchants — solving the trust gap in the $36B/yr Philippines remittance corridor. Self-custodial under the hood, but never expose words like "wallet", "blockchain", "crypto", or "Connect Wallet".

**Audience.** Senders: OFWs in Saudi, UAE, Singapore, Hong Kong, US — pragmatic, mobile-only, low patience for jargon. Receivers: family in PH on budget Android, often parents or spouses. Tone: warm but serious. Think GCash + Maya × honest credit-union, never crypto-bro.

**Visual language.** Filipino fintech warmth. Subtle sun motif (Philippine sun), banana-leaf greens, sampaguita whites — never touristy or kitsch. Color system: primary maroon `#7C1F2C` (kapamilya trust), accent golden yellow `#FFC72C` (sun), surface warm off-white `#FAF6EF`, success jade `#2E7D5B`, danger ember `#C0392B`, charcoal text `#1B1B1B`, muted `#6B6B6B`. Dark mode: warm-near-black `#161311` background, ivory text. Display font Plus Jakarta Sans bold. Body Inter. Money in JetBrains Mono — tabular numerals are non-negotiable.

**Design these 8 screens at 390×844 mobile.**

1. **Splash / Loading.** Centered PadaLock logo — a heart sealed with a small gold padlock — on maroon. Subtle radiating sun rays. Tagline: *"Padala na may pangako."* ("A remittance that keeps its promise.")

2. **Onboard — Create Wallet (3 steps in one scrollable flow).** (a) Intro card: *"Buo at ligtas. Walang bangko, walang extension."* (b) 12-word recovery phrase in a 3-column grid with copy-to-clipboard chip and an "I wrote this down" checkbox. (c) Password + confirm with live strength meter. Friendly pull-quote: *"Ikaw lang ang may hawak ng susi."*

3. **Login / Unlock.** Single password field, biometric icon (face/finger) shown but greyed-out as "soon", tiny "Forget wallet" link at bottom.

4. **Dashboard (OFW side).** Hero card with huge USDC balance, PHP equivalent below in muted text, last-refresh timestamp, small ghost button "Fund testnet". Primary CTA full-width: **Send padala** (golden button with maroon text). Quick-stats row: "Padala this month", "Buckets claimed", "Pending claims" — 3 small chips. Section **Recent padala**: list cards showing recipient name (or shortened pubkey), date, status ("3 of 5 claimed"). Sticky bottom nav: Home · Padala · Settings.

5. **Send Padala — Bucket Allocator.** Top: recipient input (paste pubkey OR pick from contacts). 5 bucket cards stacked: each shows emoji (🎓 🏥 💡 🛒 💵), bilingual name (e.g. "Tuition / Pang-aral"), numeric input on right with subtle PHP↔USDC conversion underneath. Each card has a "Use all" chip to drop the remaining balance in. Sticky footer: live total bar with sum vs available balance. "Lock & send" button stays grey until total > 0, then golden. Expandable disclosure "Why this is safe" — 2 sentences plain language.

6. **Claim Padala (Family side) — the most important screen.** Top hero: *"May padala ka galing kay [Sender]"* + total PHP big number. Below: each bucket as a card. Per card: emoji + bilingual category, big PHP amount with muted USDC below, state badge (Locked / Ready to claim / ✓ Claimed). If restricted: clean dropdown of whitelisted merchants ("Pumili ng paaralan", "Pumili ng klinika") — each option shows logo placeholder + name + shortened address. If Free Cash: input "Send to GCash or bank" with help link "Find your off-ramp address". Per-bucket "Claim now" CTA. Sticky footer: running total claimed vs available.

7. **Padala Transparency (OFW side).** Top hero: total sent vs total claimed, big numbers, animated progress arc. Per-bucket cards with timeline: *"Locked at 09:14am · Released to BIGTEN Supermart at 11:02am"* — small merchant logo or map pin. Secondary actions: "Resend reminder", "Add note for family".

8. **Empty / Error / Loading states.** Empty padala list: gentle illustration of a sealed envelope with a sun above, copy *"Wala pang padala. Mag-ipon muna o magpadala."* Tx pending: golden pulse around the affected card — never a generic spinner. Error: cinnamon-bordered card with plain-language message, no hex error codes.

**Interaction notes.** Thumb-friendly numeric keypad. All money inputs accept PHP; convert to USDC under the hood; always show both. Micro-celebration (subtle gold sparkle + haptic) on successful claim — no confetti spam. Respect safe-area insets. 3-tab bottom nav, never hamburger menus. Min 44pt tap targets. WCAG AA contrast everywhere. Voice-over labels on every emoji icon ("School icon, Tuition bucket").

**What NOT to do.** No dark-wizard aesthetic. No holographic neon. No purple/blue tech-startup palette. No glassmorphism or excessive blur. No "Connect Wallet" language. No carousel hero. No hamburger menu. No "Powered by Stellar" badge plastered around.

**Deliverables.** All 8 screens in light mode. Then one dark-mode variant of screen 6 (Claim Padala). Export Figma link + per-screen PNGs at @2x.

## COPY UP TO HERE ↑
