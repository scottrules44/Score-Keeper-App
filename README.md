# Sports Score Tracker

Landscape scoreboard for iPhone/iPad/Android with live remote control from an
**Apple Watch**, **another phone**, or **any web browser** — synced through
Firebase with a 4-digit room code.

## How it works

- Open **Scoreboard** on the device showing the game. It automatically hosts a
  session and gets a 4-digit code (tap the "Remote" chip, top-right, to see the
  code + a QR code).
- **iPhone → Apple Watch is automatic**: the app pushes the code to the watch
  via WatchConnectivity, so the watch just connects. The watch also has a
  keypad, so it works standalone too.
- **Phones/tablets**: menu → Remote Control → type the code.
- **Any browser**: https://sports-score-keeper.web.app (enter code or scan the
  QR). The web page doubles as a big **viewer scoreboard** — cast it to a TV.
- Everything syncs: scores, team names & colors, sport, period, game clock,
  sets, even the horn. The board works fully offline too; sync just turns off.

## Features

- 8 sport presets (basketball, football, soccer, hockey, volleyball,
  pickleball, baseball, generic) — scoring buttons (+1/+2/+3/+6), period
  naming (Quarter/Half/Set/Inning), and clock defaults follow the sport
- Game clock (count-down or count-up) with auto-horn at 0:00
- Editable team names + 10 neon team colors
- Sets counters for volleyball/pickleball
- Horn button 📢 on every remote
- Keeps the screen awake during games; score-change beeps; reset confirmation
- Usage analytics in Firebase (`/analytics`), Google Analytics on web
- Free plan: 4 "remote days"/month (a day counts only when a remote actually
  connects); the board itself is always unlimited. Meter lives in iCloud KV
  (`modules/cloud-kv`) so reinstalling doesn't reset it. See MONETIZATION.md.
- The board shows how many remotes are connected (presence in `rooms/*/clients`)

## One-time Firebase setup (required for remote sync)

The app expects the Realtime Database instance
`https://sports-score-keeper-default-rtdb.firebaseio.com`.

1. [Firebase console](https://console.firebase.google.com/project/sports-score-keeper)
   → Build → **Realtime Database** → *Create database* → **United States** →
   locked mode is fine (rules get replaced next).
2. Deploy database rules + the web remote:
   ```
   npm install -g firebase-tools
   firebase login
   firebase deploy
   ```
   (Rules live in `database.rules.json`, web remote in `web-remote/public/`.)

If the database ends up in a different region, update `DATABASE_URL` in
`src/firebase.js`, `DATABASE_URL` in the watch `ContentView.swift`, and
`databaseURL` in `web-remote/public/index.html`.

## Running the app

```
npm install
npx expo run:ios      # or: npx expo run:android / npx expo start
```

The Apple Watch app is the `Sports Score Tracker Watch App` target in
`ios/SportsScoreTracker.xcworkspace` — build it from Xcode onto the watch.

## Project layout

- `App.js` — menu / board / remote navigation
- `Scoreboard.js` — the board (hosts the live session by default)
- `screens/RemoteScreen.js` — phone/tablet remote (join by code)
- `src/useRoom.js` — Firebase room: host/join/actions, one shared code path
- `src/useLocalGame.js` — offline twin of the room (board with no internet)
- `src/sports.js` — sport presets, colors, game-state helpers
- `src/analytics.js` — event counters (+ optional GA4, see MONETIZATION.md)
- `src/watchSync.js` — pushes the session code to the Apple Watch
- `ios/Sports Score Tracker Watch App/ContentView.swift` — the watch remote
- `web-remote/public/index.html` — web remote + TV viewer (Firebase Hosting)
- `database.rules.json` — Realtime Database validation rules
