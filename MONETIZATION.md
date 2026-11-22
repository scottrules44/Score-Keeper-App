# Monetization: free-forever board, metered remote hosting

Decisions made (Aug 2026): **no ads, ever.** Nothing existing users have today
gets taken away — the scoreboard itself (all sports, clock, horn, colors) is
free and unlimited, offline and online. The Pro line sits on the genuinely
expensive/valuable new thing: **hosting live remote sessions**.

## The model

- **Free plan**: 4 "remote days" per calendar month (`FREE_REMOTE_DAYS_PER_MONTH`
  in `src/meter.js`). A remote day is only consumed on a day when a remote
  actually connects to your board — hosting with nobody connected costs
  nothing, reopening the board costs nothing, and a day already in use never
  cuts off mid-game. Resets on the 1st.
- **Pro (one-time purchase, $3.99, shipped in 2.1)**: unlimited remote days. That's it —
  honest and easy to explain. Casual users (a game night or two a month) never
  hit the limit; coaches and leagues using remotes weekly are exactly the
  people happy to pay once.
- Joining as a remote (watch, phone, web) is always free — remotes are guests
  of the host's session.

## Why cheaters mostly can't cheat

- **iOS (where hosting lives)**: the meter is stored in **iCloud Key-Value
  storage** (`modules/cloud-kv`), which survives delete + reinstall and syncs
  across the same user's iPhone/iPad. Casual reinstall-to-reset doesn't work.
- **Web**: browsers can't read MAC addresses at all, and IP-based limits would
  need a server (Firebase rules never see request IPs) — and private browsing
  defeats localStorage in one click. So instead, **production web builds don't
  host sessions at all** (`CAN_HOST_HERE` in `Scoreboard.js`) — web is a free
  remote/viewer. No hosting on web → nothing to evade in a private window.
- **Android**: AsyncStorage plus Android auto-backup (restores through
  reinstall for most users). Weaker than iCloud, acceptable.
- A determined tinkerer can still beat any client-side meter. That's fine:
  the goal is a nudge for honest heavy users, and those tinkerers were never
  going to pay. If analytics ever show real abuse, the hard fix is known:
  Firebase Auth (Sign in with Apple/Google) + the meter enforced server-side
  per account. Don't build that until the data says so.

## How the purchase works (2.1)

- Product: non-consumable `tech.scotth.scorekeeper.pro`, $3.99 (USA base
  price, all territories, Family Sharing on), created in App Store Connect.
- `modules/pro-store`: local Expo module on StoreKit 2 — buy, restore, and
  entitlement check via `Transaction.currentEntitlements`. No RevenueCat, no
  server. Also listens to `Transaction.updates` (Ask to Buy, refunds).
- `src/pro.js`: single source of `isPro` (StoreKit, cached in iCloud KV).
- UI: "Get Pro — $3.99" + "Restore" in the Remote sheet (small under the
  meter, full paywall when free days run out). Android/web hide it.
- Android (Play Billing) is not wired up yet.

## Analytics to watch (already live)

Google Analytics for Firebase (iOS native SDK via `modules/firebase-analytics`,
web via Firebase JS) — Firebase console -> Analytics. Pro funnel events:
`pro_offer_shown_{upsell,paywall}`, `pro_buy_tap_*`, `pro_purchased`,
`pro_cancelled`, `pro_pending`, `pro_buy_failed`, `pro_restore_tap`,
`pro_restored`, `pro_restore_none`, `meter_blocked`; user property `is_pro`;
screen views `menu` / `board` / `remote`.

The older Realtime Database counters still run too —
`/analytics` in the Firebase console counts per platform per day:
`board_opened`, `session_started`, `remote_joined`, `horn`, `sport_*`,
`viewer_opened`, `web_open`. The number that justifies shipping the purchase:
how many devices host remotes on 5+ days/month. GA4 (web) works now;
add a Measurement Protocol secret in `src/analytics.js` for GA from the app.

## Firebase costs

Free tier: 100 simultaneous connections, 1 GB stored, 10 GB/month download.
Rooms are <2 KB; even hundreds of active boards stay free. Revisit only if
`/analytics` shows thousands of daily sessions.
