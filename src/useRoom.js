import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ref,
  onValue,
  get,
  set,
  update,
  remove,
  increment,
  serverTimestamp,
  onDisconnect,
  push,
} from 'firebase/database';
import { db } from './firebase';
import { getSport, makeInitialGame, normalizeGame, timerDisplayMs } from './sports';
import { pushSessionCode } from './watchSync';

export function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function isValidCode(text) {
  return /^\d{4}$/.test(text);
}

// If the timer is running, fold the elapsed time into remainMs so the game can
// move between clocks (local <-> server) without jumping.
export function collapseTimer(game, now) {
  const t = game.timer;
  if (!t?.running) return game;
  return { ...game, timer: { ...t, remainMs: timerDisplayMs(t, now), startAt: now } };
}

function friendlyError(e) {
  const msg = String(e?.message || e || 'Unknown error');
  if (/permission/i.test(msg)) return 'Permission denied — check the database rules.';
  if (/network|offline|timeout|failed to fetch/i.test(msg)) return 'No connection — check your internet.';
  return msg;
}

// The Firebase SDK retries unreachable databases forever; surface a friendly
// error instead of an endless spinner.
function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

const STALE_ROOM_MS = 12 * 60 * 60 * 1000;

// One hook that powers both sides of a live session:
//  - the scoreboard hosts a room (creates it, owns its code)
//  - remotes join an existing room by code
// Every write goes through the database; the subscription is the single
// source of truth for the on-screen game while online.
export function useRoom() {
  const [status, setStatus] = useState('idle'); // idle|connecting|online|ended|error
  const [code, setCode] = useState(null);
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  const serverOffsetRef = useRef(0);
  const gameRef = useRef(null);
  const codeRef = useRef(null);
  const isHostRef = useRef(false);
  const roomUnsubRef = useRef(null);
  const disconnectRef = useRef(null);
  const presenceRef = useRef(null);

  useEffect(() => {
    const u1 = onValue(ref(db, '.info/serverTimeOffset'), (s) => {
      serverOffsetRef.current = s.val() || 0;
    });
    const u2 = onValue(ref(db, '.info/connected'), (s) => setConnected(!!s.val()));
    return () => {
      u1();
      u2();
      if (roomUnsubRef.current) roomUnsubRef.current();
    };
  }, []);

  const serverNow = useCallback(() => Date.now() + serverOffsetRef.current, []);

  const subscribe = useCallback((roomCode) => {
    if (roomUnsubRef.current) roomUnsubRef.current();
    roomUnsubRef.current = onValue(
      ref(db, `rooms/${roomCode}`),
      (snap) => {
        if (!snap.exists()) {
          if (!isHostRef.current) {
            // Host ended the session and removed the room.
            gameRef.current = null;
            setGame(null);
            setStatus('ended');
          }
          return;
        }
        const g = normalizeGame(snap.val());
        gameRef.current = g;
        setGame(g);
        setStatus('online');
      },
      (err) => {
        setError(friendlyError(err));
        setStatus('error');
      }
    );
  }, []);

  const host = useCallback(
    async (preferredCode, initialGame) => {
      setStatus('connecting');
      setError(null);
      isHostRef.current = true;
      try {
        let roomCode = isValidCode(preferredCode) ? preferredCode : null;

        if (roomCode) {
          // Our saved room may still be live (board was closed while remotes
          // kept scoring) — resume it instead of clobbering it.
          const snap = await withTimeout(get(ref(db, `rooms/${roomCode}`)));
          const val = snap.exists() ? snap.val() : null;
          const fresh = val && val.updatedAt && serverNow() - val.updatedAt < STALE_ROOM_MS;
          if (fresh) {
            await withTimeout(
              update(ref(db, `rooms/${roomCode}`), {
                hostOnline: true,
                // Watch/REST remotes can't auto-remove their presence; a fresh
                // session start is the natural point to sweep stale entries.
                clients: null,
                updatedAt: serverTimestamp(),
              })
            );
            disconnectRef.current = onDisconnect(ref(db, `rooms/${roomCode}/hostOnline`));
            disconnectRef.current.set(false).catch(() => {});
            codeRef.current = roomCode;
            setCode(roomCode);
            subscribe(roomCode);
            pushSessionCode(roomCode);
            return roomCode;
          }
        }

        if (!roomCode) {
          for (let i = 0; i < 8; i++) {
            const candidate = generateCode();
            const snap = await withTimeout(get(ref(db, `rooms/${candidate}`)));
            const val = snap.exists() ? snap.val() : null;
            const inUse =
              val && val.updatedAt && serverNow() - val.updatedAt < STALE_ROOM_MS;
            if (!inUse) {
              roomCode = candidate;
              break;
            }
          }
          if (!roomCode) roomCode = generateCode();
        }

        const g = collapseTimer(initialGame || makeInitialGame(), Date.now());
        const seed = {
          ...g,
          timer: {
            ...g.timer,
            startAt: g.timer.running ? serverTimestamp() : 0,
          },
          hostOnline: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await withTimeout(set(ref(db, `rooms/${roomCode}`), seed));

        disconnectRef.current = onDisconnect(ref(db, `rooms/${roomCode}/hostOnline`));
        disconnectRef.current.set(false).catch(() => {});

        codeRef.current = roomCode;
        setCode(roomCode);
        subscribe(roomCode);
        pushSessionCode(roomCode);
        return roomCode;
      } catch (e) {
        isHostRef.current = false;
        setError(friendlyError(e));
        setStatus('error');
        return null;
      }
    },
    [serverNow, subscribe]
  );

  const join = useCallback(
    async (roomCode) => {
      setStatus('connecting');
      setError(null);
      isHostRef.current = false;
      try {
        const snap = await withTimeout(get(ref(db, `rooms/${roomCode}`)));
        if (!snap.exists()) {
          setError('No game found with that code.');
          setStatus('error');
          return false;
        }
        codeRef.current = roomCode;
        setCode(roomCode);
        subscribe(roomCode);
        pushSessionCode(roomCode);

        // Announce ourselves so the board can show connected remotes.
        try {
          presenceRef.current = push(ref(db, `rooms/${roomCode}/clients`));
          set(presenceRef.current, serverTimestamp()).catch(() => {});
          onDisconnect(presenceRef.current).remove().catch(() => {});
        } catch {}
        return true;
      } catch (e) {
        setError(friendlyError(e));
        setStatus('error');
        return false;
      }
    },
    [subscribe]
  );

  const leave = useCallback(async (endRoom = false) => {
    const roomCode = codeRef.current;
    if (roomUnsubRef.current) {
      roomUnsubRef.current();
      roomUnsubRef.current = null;
    }
    if (disconnectRef.current) {
      disconnectRef.current.cancel().catch(() => {});
      disconnectRef.current = null;
    }
    if (presenceRef.current) {
      remove(presenceRef.current).catch(() => {});
      presenceRef.current = null;
    }
    if (roomCode && isHostRef.current) {
      if (endRoom) {
        remove(ref(db, `rooms/${roomCode}`)).catch(() => {});
      } else {
        update(ref(db, `rooms/${roomCode}`), { hostOnline: false }).catch(() => {});
      }
    }
    codeRef.current = null;
    isHostRef.current = false;
    setCode(null);
    setGame(null);
    gameRef.current = null;
    setStatus('idle');
    setError(null);
    pushSessionCode(null);
  }, []);

  // ---- shared write actions ----------------------------------------------

  const roomRef = useCallback((sub) => {
    return ref(db, `rooms/${codeRef.current}${sub ? `/${sub}` : ''}`);
  }, []);

  const write = useCallback(
    (fields) => {
      if (!codeRef.current) return;
      update(roomRef(), { ...fields, updatedAt: serverTimestamp() }).catch(() => {});
    },
    [roomRef]
  );

  const bump = useCallback(
    (team, delta) => {
      const cur = gameRef.current?.[team]?.score ?? 0;
      if (delta < 0 && cur <= 0) return;
      write({ [`${team}/score`]: increment(delta) });
    },
    [write]
  );

  const bumpSets = useCallback(
    (team, delta) => {
      const cur = gameRef.current?.[team]?.sets ?? 0;
      if (delta < 0 && cur <= 0) return;
      write({ [`${team}/sets`]: increment(delta) });
    },
    [write]
  );

  const setTeamInfo = useCallback(
    (team, { name, color }) => {
      const fields = {};
      if (name !== undefined) fields[`${team}/name`] = String(name).slice(0, 20) || 'Team';
      if (color !== undefined) fields[`${team}/color`] = color;
      write(fields);
    },
    [write]
  );

  const setPeriod = useCallback(
    (delta) => {
      const g = gameRef.current;
      if (!g) return;
      const max = getSport(g.sport).maxPeriods;
      const next = Math.min(max, Math.max(1, (g.period || 1) + delta));
      if (next === g.period) return;
      write({ period: next });
    },
    [write]
  );

  const setSport = useCallback(
    (sportKey) => {
      const fresh = makeInitialGame(sportKey);
      write({
        sport: sportKey,
        period: 1,
        'home/score': 0,
        'away/score': 0,
        'home/sets': 0,
        'away/sets': 0,
        timer: fresh.timer,
      });
    },
    [write]
  );

  const timerStart = useCallback(() => {
    const t = gameRef.current?.timer;
    if (!t || t.running) return;
    if (!t.countUp && t.remainMs <= 0) return;
    if (t.countUp && t.remainMs >= t.durationMs) return;
    write({ 'timer/running': true, 'timer/startAt': serverTimestamp() });
  }, [write]);

  const timerPause = useCallback(() => {
    const t = gameRef.current?.timer;
    if (!t?.running) return;
    write({
      'timer/running': false,
      'timer/remainMs': timerDisplayMs(t, serverNow()),
    });
  }, [write, serverNow]);

  const timerReset = useCallback(() => {
    const t = gameRef.current?.timer;
    if (!t) return;
    write({
      'timer/running': false,
      'timer/remainMs': t.countUp ? 0 : t.durationMs,
    });
  }, [write]);

  const timerSetMinutes = useCallback(
    (minutes) => {
      const ms = Math.max(1, Math.round(minutes)) * 60000;
      const countUp = !!gameRef.current?.timer?.countUp;
      write({
        'timer/running': false,
        'timer/durationMs': ms,
        'timer/remainMs': countUp ? 0 : ms,
      });
    },
    [write]
  );

  const horn = useCallback(() => {
    write({ horn: serverTimestamp() });
  }, [write]);

  const resetGame = useCallback(() => {
    const t = gameRef.current?.timer;
    write({
      'home/score': 0,
      'away/score': 0,
      'home/sets': 0,
      'away/sets': 0,
      period: 1,
      'timer/running': false,
      'timer/remainMs': t ? (t.countUp ? 0 : t.durationMs) : 0,
    });
  }, [write]);

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

  return {
    status,
    code,
    game,
    error,
    connected,
    isHost: isHostRef.current,
    serverNow,
    host,
    join,
    leave,
    actions,
  };
}
