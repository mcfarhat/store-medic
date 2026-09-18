# Store Medic

Always-on AI agents that watch a WooCommerce store 24/7, verify problems, and let the owner approve a fix from
their phone. Built for the RevenueCat Shipaton 2026. Part of the SMB "Trust Engine" campaign (see
`agentgram:workspace/hackathons/PLAN.md`).

## Architecture — "Watch → Verify → Approve"
- **engine/** — Node/TypeScript backend (runs on our cloud, always-on). Schedules watchers, verifies findings,
  exposes a small API the app polls + push. This is the shared core reused by the Alexa+ and Nebius entries.
  - `watchers/` — pluggable monitors (WooCommerce store health is the first).
  - `verify.ts` — turns a raw signal into a confirmed, evidence-backed finding (dedupe + checks + Tavily cite).
  - `engine.ts` — the Watch→Verify→Approve loop + finding lifecycle.
- **app/** — Expo (React Native) mobile client: a feed of findings, one-tap "approve fix", RevenueCat paywall.
  Ships to Google Play first (company account = production-eligible), Apple optional.

## Findings model
A finding = {id, storeId, kind, severity, title, evidence[], suggestedFix, status}. Status flows
`open → awaiting_approval → approved → resolved` (or `dismissed`). Nothing acts on the store without owner approval.

## Monetization (RevenueCat)
Subscription (Store Medic Pro): >1 store, faster check cadence, auto-fix actions, and priority alerts. Free tier =
1 store, hourly checks, alert-only. RevenueCat entitlements gate Pro features.

## Status
Scaffold. Engine + app skeletons in place. NOT yet wired to a live store or RevenueCat keys. See PLAN.md Phase 0.
Push target: github.com/mcfarhat/store-medic (needs mcfarhat GitHub auth).
