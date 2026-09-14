// Sport presets. Each preset drives which buttons the scoreboard / remotes
// render, what the period is called, and the default clock behavior.
export const SPORTS = {
  generic: {
    label: 'Generic',
    emoji: '🏆',
    increments: [1],
    periodLabel: 'Period',
    maxPeriods: 99,
    sets: false,
    timer: { enabled: true, minutes: 10, countUp: false },
  },
  basketball: {
    label: 'Basketball',
    emoji: '🏀',
    increments: [1, 2, 3],
    periodLabel: 'Quarter',
    maxPeriods: 4,
    sets: false,
    timer: { enabled: true, minutes: 12, countUp: false },
  },
  football: {
    label: 'Football',
    emoji: '🏈',
    increments: [1, 2, 3, 6],
    periodLabel: 'Quarter',
    maxPeriods: 4,
    sets: false,
    timer: { enabled: true, minutes: 15, countUp: false },
  },
  soccer: {
    label: 'Soccer',
    emoji: '⚽',
    increments: [1],
    periodLabel: 'Half',
    maxPeriods: 2,
    sets: false,
    timer: { enabled: true, minutes: 45, countUp: true },
  },
  hockey: {
    label: 'Hockey',
    emoji: '🏒',
    increments: [1],
    periodLabel: 'Period',
    maxPeriods: 3,
    sets: false,
    timer: { enabled: true, minutes: 20, countUp: false },
  },
  volleyball: {
    label: 'Volleyball',
    emoji: '🏐',
    increments: [1],
    periodLabel: 'Set',
    maxPeriods: 5,
    sets: true,
    timer: { enabled: false, minutes: 0, countUp: false },
  },
  pickleball: {
    label: 'Pickleball',
    emoji: '🥒',
    increments: [1],
    periodLabel: 'Game',
    maxPeriods: 3,
    sets: true,
    timer: { enabled: false, minutes: 0, countUp: false },
  },
  baseball: {
    label: 'Baseball',
    emoji: '⚾',
    increments: [1],
    periodLabel: 'Inning',
    maxPeriods: 9,
    sets: false,
    timer: { enabled: false, minutes: 0, countUp: false },
  },
};

export const SPORT_KEYS = Object.keys(SPORTS);

export function getSport(key) {
  return SPORTS[key] || SPORTS.generic;
}

// Neon palette that pops on the black scoreboard.
export const TEAM_COLORS = [
  '#FF10F0', // neon pink (classic Home)
  '#00FFFF', // cyan (classic Away)
  '#39FF14', // neon green
  '#FFFF00', // yellow
  '#FF5F1F', // orange
  '#FF3131', // red
  '#1F51FF', // blue
  '#BC13FE', // purple
  '#FF69B4', // hot pink
  '#FFFFFF', // white
];

export const DEFAULT_HOME_COLOR = TEAM_COLORS[0];
export const DEFAULT_AWAY_COLOR = TEAM_COLORS[1];

// Canonical shape of a game/room. Used by the local (offline) game and as the
// seed when hosting a live session.
export function makeInitialGame(sportKey = 'generic') {
  const sport = getSport(sportKey);
  return {
    sport: sportKey,
    home: { name: 'Home', score: 0, sets: 0, color: DEFAULT_HOME_COLOR },
    away: { name: 'Away', score: 0, sets: 0, color: DEFAULT_AWAY_COLOR },
    period: 1,
    timer: {
      running: false,
      startAt: 0,
      remainMs: sport.timer.minutes * 60000,
      durationMs: sport.timer.minutes * 60000,
      countUp: !!sport.timer.countUp,
    },
    horn: 0,
  };
}

// Normalize whatever came out of the database into a full game object so the
// UI never has to null-check deep fields.
export function normalizeGame(raw) {
  const base = makeInitialGame(raw?.sport || 'generic');
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    home: { ...base.home, ...(raw.home || {}) },
    away: { ...base.away, ...(raw.away || {}) },
    timer: { ...base.timer, ...(raw.timer || {}) },
  };
}

export function formatClock(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Remaining (or elapsed, for count-up) milliseconds for a timer object.
// `serverNow` should be Date.now() + serverTimeOffset when synced.
export function timerDisplayMs(timer, serverNow) {
  if (!timer.running) return timer.remainMs;
  const elapsedSinceStart = Math.max(0, serverNow - (timer.startAt || serverNow));
  if (timer.countUp) {
    return Math.min(timer.durationMs, timer.remainMs + elapsedSinceStart);
  }
  return Math.max(0, timer.remainMs - elapsedSinceStart);
}
