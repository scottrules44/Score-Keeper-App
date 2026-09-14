import { kvGet, kvSet } from '../modules/cloud-kv';

// Free-plan meter for remote sessions.
//
// The unit is a "remote day": a calendar day on which this device's scoreboard
// had at least one remote actually connected. Hosting locally, scoring,
// clocks, horns — all always free. Opening the board multiple times, or
// hosting with no remotes attached, consumes nothing. Pro removes the limit.
//
// Usage lives in iCloud key-value storage (see modules/cloud-kv), so deleting
// and reinstalling the app does not reset it, and an iPhone + iPad pair share
// one allowance.
export const FREE_REMOTE_DAYS_PER_MONTH = 4;

const KEY = 'sk:remoteDays';

function today() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function monthOf(day) {
  return day.slice(0, 6);
}

async function readDays() {
  try {
    const raw = await kvGet(KEY);
    const days = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(days)) return [];
    // Keep only the current month (past months are irrelevant, keeps it tiny).
    const m = monthOf(today());
    return days.filter((d) => typeof d === 'string' && monthOf(d) === m);
  } catch {
    return [];
  }
}

export async function getMeter() {
  const days = await readDays();
  const t = today();
  const usedToday = days.includes(t);
  const usedThisMonth = days.length;
  return {
    usedToday,
    usedThisMonth,
    remaining: Math.max(0, FREE_REMOTE_DAYS_PER_MONTH - usedThisMonth),
    // A day already in use stays usable — never cut a game day short.
    canUseToday: usedToday || usedThisMonth < FREE_REMOTE_DAYS_PER_MONTH,
  };
}

// Record that a remote connected today. Idempotent.
export async function burnRemoteDay() {
  const days = await readDays();
  const t = today();
  if (days.includes(t)) return;
  days.push(t);
  await kvSet(KEY, JSON.stringify(days));
}
