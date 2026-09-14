import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSport, makeInitialGame, normalizeGame, timerDisplayMs } from './sports';

const STORAGE_KEY = 'sk:localGame';

// Offline twin of useRoom: identical action API, but state lives on-device.
// The scoreboard uses this when no live session is running, so the board
// works with zero connectivity.
export function useLocalGame() {
  const [game, setGameState] = useState(() => makeInitialGame('generic'));
  const gameRef = useRef(game);
  const loadedRef = useRef(false);

  const commit = useCallback((next) => {
    gameRef.current = next;
    setGameState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const g = normalizeGame(JSON.parse(raw));
          // A timer that was running when the app was killed stays sane:
          // fold elapsed time in and pause it.
          if (g.timer.running) {
            g.timer = {
              ...g.timer,
              running: false,
              remainMs: timerDisplayMs(g.timer, Date.now()),
            };
          }
          gameRef.current = g;
          setGameState(g);
        }
      } catch {}
      loadedRef.current = true;
    })();
  }, []);

  const patch = useCallback(
    (mutate) => {
      const next = mutate(gameRef.current);
      if (next) commit(next);
    },
    [commit]
  );

  const adopt = useCallback(
    (g) => {
      commit(normalizeGame(g));
    },
    [commit]
  );

  const bump = useCallback(
    (team, delta) =>
      patch((g) => {
        const score = Math.max(0, (g[team].score || 0) + delta);
        if (score === g[team].score) return null;
        return { ...g, [team]: { ...g[team], score } };
      }),
    [patch]
  );

  const bumpSets = useCallback(
    (team, delta) =>
      patch((g) => {
        const sets = Math.max(0, (g[team].sets || 0) + delta);
        if (sets === g[team].sets) return null;
        return { ...g, [team]: { ...g[team], sets } };
      }),
    [patch]
  );

  const setTeamInfo = useCallback(
    (team, { name, color }) =>
      patch((g) => ({
        ...g,
        [team]: {
          ...g[team],
          ...(name !== undefined ? { name: String(name).slice(0, 20) || 'Team' } : {}),
          ...(color !== undefined ? { color } : {}),
        },
      })),
    [patch]
  );

  const setPeriod = useCallback(
    (delta) =>
      patch((g) => {
        const max = getSport(g.sport).maxPeriods;
        const period = Math.min(max, Math.max(1, (g.period || 1) + delta));
        if (period === g.period) return null;
        return { ...g, period };
      }),
    [patch]
  );

  const setSport = useCallback(
    (sportKey) =>
      patch((g) => {
        const fresh = makeInitialGame(sportKey);
        return {
          ...fresh,
          home: { ...g.home, score: 0, sets: 0 },
          away: { ...g.away, score: 0, sets: 0 },
          horn: g.horn,
        };
      }),
    [patch]
  );

  const timerStart = useCallback(
    () =>
      patch((g) => {
        const t = g.timer;
        if (t.running) return null;
        if (!t.countUp && t.remainMs <= 0) return null;
        if (t.countUp && t.remainMs >= t.durationMs) return null;
        return { ...g, timer: { ...t, running: true, startAt: Date.now() } };
      }),
    [patch]
  );

  const timerPause = useCallback(
    () =>
      patch((g) => {
        const t = g.timer;
        if (!t.running) return null;
        return {
          ...g,
          timer: { ...t, running: false, remainMs: timerDisplayMs(t, Date.now()) },
        };
      }),
    [patch]
  );

  const timerReset = useCallback(
    () =>
      patch((g) => ({
        ...g,
        timer: {
          ...g.timer,
          running: false,
          remainMs: g.timer.countUp ? 0 : g.timer.durationMs,
        },
      })),
    [patch]
  );

  const timerSetMinutes = useCallback(
    (minutes) =>
      patch((g) => {
        const ms = Math.max(1, Math.round(minutes)) * 60000;
        return {
          ...g,
          timer: {
            ...g.timer,
            running: false,
            durationMs: ms,
            remainMs: g.timer.countUp ? 0 : ms,
          },
        };
      }),
    [patch]
  );

  const horn = useCallback(
    () => patch((g) => ({ ...g, horn: Date.now() })),
    [patch]
  );

  const resetGame = useCallback(
    () =>
      patch((g) => ({
        ...g,
        home: { ...g.home, score: 0, sets: 0 },
        away: { ...g.away, score: 0, sets: 0 },
        period: 1,
        timer: {
          ...g.timer,
          running: false,
          remainMs: g.timer.countUp ? 0 : g.timer.durationMs,
        },
      })),
    [patch]
  );

  const actions = useMemo(
    () => ({
      bump,
      bumpSets,
      setTeamInfo,
      setPeriod,
      setSport,
      timerStart,
      timerPause,
      timerReset,
      timerSetMinutes,
      horn,
      resetGame,
    }),
    [
      bump,
      bumpSets,
      setTeamInfo,
      setPeriod,
      setSport,
      timerStart,
      timerPause,
      timerReset,
      timerSetMinutes,
      horn,
      resetGame,
    ]
  );

  return { game, adopt, actions };
}
