import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from './CustomButton';
import TeamColumn from './src/components/TeamColumn';
import { EditTeamModal, SportModal, TimerModal, SessionModal } from './src/components/modals';
import { useLocalGame } from './src/useLocalGame';
import { useRoom, collapseTimer } from './src/useRoom';
import { getSport, formatClock, timerDisplayMs } from './src/sports';
import { logEvent } from './src/analytics';
import { useEntitlements, getIsPro } from './src/pro';
import { getMeter, burnRemoteDay, FREE_REMOTE_DAYS_PER_MONTH } from './src/meter';

// Hosting live sessions is an app feature; production web builds only join as
// remotes (this also makes the free-plan meter meaningful — browser storage
// is trivially resettable, iCloud/device storage is not).
const CAN_HOST_HERE = Platform.OS !== 'web' || __DEV__;

const HOST_CODE_KEY = 'sk:hostCode';
const SOUND_KEY = 'sk:soundOn';

function confirmDialog(title, message, onYes) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Yes', onPress: onYes },
    { text: 'No', style: 'cancel' },
  ]);
}

const Scoreboard = ({ onBack }) => {
  const { width, height } = useWindowDimensions();
  const local = useLocalGame();
  const session = useRoom();

  const online = session.status === 'online' && !!session.game;
  const game = online ? session.game : local.game;
  const api = online ? session.actions : local.actions;
  const sport = getSport(game.sport);

  const now = useCallback(
    () => (online ? session.serverNow() : Date.now()),
    [online, session.serverNow]
  );

  // ---- sounds -------------------------------------------------------------
  const [soundOn, setSoundOn] = useState(true);
  const beepRef = useRef(null);
  const hornSoundRef = useRef(null);
  const soundOnRef = useRef(true);
  soundOnRef.current = soundOn;

  useEffect(() => {
    let beep;
    let horn;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      } catch {}
      try {
        beep = (await Audio.Sound.createAsync(require('./assets/beep.wav'))).sound;
        beepRef.current = beep;
      } catch {}
      try {
        horn = (await Audio.Sound.createAsync(require('./assets/horn.wav'))).sound;
        hornSoundRef.current = horn;
      } catch {}
      try {
        const saved = await AsyncStorage.getItem(SOUND_KEY);
        if (saved !== null) setSoundOn(saved === '1');
      } catch {}
    })();
    return () => {
      beep?.unloadAsync();
      horn?.unloadAsync();
    };
  }, []);

  const playBeep = useCallback(() => {
    if (!soundOnRef.current) return;
    beepRef.current?.replayAsync().catch(() => {});
  }, []);

  const playHorn = useCallback(() => {
    if (!soundOnRef.current) return;
    (hornSoundRef.current || beepRef.current)?.replayAsync().catch(() => {});
  }, []);

  const toggleSound = () => {
    setSoundOn((s) => {
      AsyncStorage.setItem(SOUND_KEY, s ? '0' : '1').catch(() => {});
      return !s;
    });
  };

  // Beep whenever a score changes, no matter who changed it (board or remote).
  const prevScores = useRef(null);
  useEffect(() => {
    const key = `${game.home.score}|${game.away.score}`;
    if (prevScores.current !== null && prevScores.current !== key) playBeep();
    prevScores.current = key;
  }, [game.home.score, game.away.score, playBeep]);

  // Horn: fires when any device (watch/web/phone) hits the horn button.
  const prevHorn = useRef(null);
  useEffect(() => {
    if (prevHorn.current !== null && game.horn && game.horn !== prevHorn.current) {
      playHorn();
    }
    prevHorn.current = game.horn || 0;
  }, [game.horn, playHorn]);

  // ---- clock --------------------------------------------------------------
  const [clockMs, setClockMs] = useState(game.timer.remainMs);
  const autoStopRef = useRef(false);

  useEffect(() => {
    const compute = () => timerDisplayMs(game.timer, now());
    setClockMs(compute());
    if (!game.timer.running) {
      autoStopRef.current = false;
      return undefined;
    }
    const id = setInterval(() => {
      const ms = compute();
      setClockMs(ms);
      const done = game.timer.countUp ? ms >= game.timer.durationMs : ms <= 0;
      if (done && !autoStopRef.current) {
        autoStopRef.current = true;
        api.timerPause();
        playHorn();
      }
    }, 200);
    return () => clearInterval(id);
  }, [game.timer, api, now, playHorn]);

  // ---- session ------------------------------------------------------------
  const [modal, setModal] = useState(null); // 'home'|'away'|'sport'|'timer'|'session'
  const [meter, setMeter] = useState(null);
  const [meterBlocked, setMeterBlocked] = useState(false);
  const ent = useEntitlements();

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const localRef = useRef(local);
  localRef.current = local;

  const refreshMeter = useCallback(() => {
    getMeter().then(setMeter).catch(() => {});
  }, []);

  const startSession = async () => {
    if (!CAN_HOST_HERE) return;
    const pro = await getIsPro().catch(() => false);
    if (!pro) {
      const m = await getMeter();
      setMeter(m);
      if (!m.canUseToday) {
        logEvent('meter_blocked');
        setMeterBlocked(true);
        return;
      }
    }
    setMeterBlocked(false);
    const saved = await AsyncStorage.getItem(HOST_CODE_KEY).catch(() => null);
    const code = await sessionRef.current.host(saved, localRef.current.game);
    if (code) {
      AsyncStorage.setItem(HOST_CODE_KEY, code).catch(() => {});
      logEvent('session_started');
    }
  };

  // A free-plan "remote day" is only consumed when a remote actually connects.
  const clientCount = online ? Object.keys(session.game?.clients || {}).length : 0;
  useEffect(() => {
    if (!online || clientCount === 0 || ent.isPro) return;
    burnRemoteDay()
      .then(refreshMeter)
      .catch(() => {});
  }, [online, clientCount > 0, ent.isPro, refreshMeter]);

  useEffect(() => {
    refreshMeter();
  }, [refreshMeter]);

  // Sync by default: quietly host a session so the watch, web, and phone
  // remotes connect on their own. If there's no connection, the board just
  // keeps working locally.
  useEffect(() => {
    logEvent('board_opened');
    const t = setTimeout(startSession, 400);
    return () => {
      clearTimeout(t);
      const s = sessionRef.current;
      if (s.game) {
        // Carry the live game back into local state, keep the room alive so
        // remotes see "board offline" instead of losing the session.
        const g = collapseTimer(s.game, s.serverNow());
        localRef.current.adopt({ ...g, timer: { ...g.timer, startAt: Date.now() } });
      }
      if (s.status === 'online' || s.status === 'connecting') {
        s.leave(false);
      }
    };
  }, []);

  const stopSession = () => {
    if (session.game) {
      const g = collapseTimer(session.game, session.serverNow());
      local.adopt({ ...g, timer: { ...g.timer, startAt: Date.now() } });
    }
    session.leave(true);
    setModal(null);
    logEvent('session_stopped');
  };

  const doReset = () => {
    confirmDialog('Score Reset', 'Are you sure you want to reset the game?', () =>
      api.resetGame()
    );
  };

  // Everything scales off the window so tablets/TVs get proportionally
  // bigger controls, not just a bigger score.
  const scale = Math.max(0.75, Math.min(width / 900, height / 460, 2.2));
  // Web fallback (native uses auto-fit text instead).
  const scoreFont = Math.max(130, Math.min(height * 0.56, width * 0.27));
  const clockDone = !game.timer.countUp && clockMs <= 0;

  return (
    <View style={styles.container}>
      {/* top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Menu</Text>
        </TouchableOpacity>

        <View style={[styles.topCenter, { gap: 24 * scale }]}>
          {sport.timer.enabled && (
            <View style={[styles.clockGroup, { gap: 10 * scale }]}>
              <CustomButton
                text={game.timer.running ? '⏸' : '▶'}
                fontSize={24 * scale}
                color={game.timer.running ? '#FFFF00' : '#39FF14'}
                style={{ paddingHorizontal: 16 * scale, paddingVertical: 8 * scale }}
                onPress={() => (game.timer.running ? api.timerPause() : api.timerStart())}
              />
              <TouchableOpacity onPress={() => setModal('timer')}>
                <Text
                  style={[
                    styles.clockText,
                    { fontSize: 48 * scale, minWidth: 130 * scale },
                    clockDone && !game.timer.countUp && styles.clockDone,
                  ]}
                >
                  {formatClock(clockMs)}
                </Text>
              </TouchableOpacity>
              <CustomButton
                text="↺"
                fontSize={24 * scale}
                color="#999"
                style={{ paddingHorizontal: 14 * scale, paddingVertical: 8 * scale }}
                onPress={() => api.timerReset()}
              />
            </View>
          )}
          <View style={[styles.periodGroup, { gap: 10 * scale }]}>
            <CustomButton
              text="−"
              fontSize={20 * scale}
              color="#999"
              style={{ paddingHorizontal: 12 * scale, paddingVertical: 6 * scale }}
              onPress={() => api.setPeriod(-1)}
            />
            <Text style={[styles.periodText, { fontSize: 26 * scale }]}>
              {sport.periodLabel} {game.period}
            </Text>
            <CustomButton
              text="+"
              fontSize={20 * scale}
              color="#999"
              style={{ paddingHorizontal: 12 * scale, paddingVertical: 6 * scale }}
              onPress={() => api.setPeriod(1)}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.remoteChip} onPress={() => setModal('session')}>
          <View
            style={[
              styles.dot,
              { backgroundColor: online ? (session.connected ? '#39FF14' : '#FF5F1F') : '#555' },
            ]}
          />
          <Text style={styles.remoteChipText}>
            {online ? `${session.code}${clientCount ? ` · ${clientCount}👤` : ''}` : 'Remote'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* main row */}
      <View style={styles.mainRow}>
        <TeamColumn
          info={game.home}
          increments={sport.increments}
          showSets={sport.sets}
          scale={scale}
          scoreFont={scoreFont}
          onBump={(d) => api.bump('home', d)}
          onBumpSets={(d) => api.bumpSets('home', d)}
          onEdit={() => setModal('home')}
        />

        <View style={[styles.middleCol, { gap: 14 * scale, minWidth: 130 * scale }]}>
          <CustomButton
            text={`${sport.emoji} ${sport.label}`}
            fontSize={16 * scale}
            color="#00FFFF"
            onPress={() => setModal('sport')}
          />
          <CustomButton text="Reset" fontSize={16 * scale} onPress={doReset} />
          <CustomButton
            text={soundOn ? '🔊 Sound' : '🔇 Muted'}
            fontSize={16 * scale}
            onPress={toggleSound}
          />
          <CustomButton
            text="📢 HORN"
            fontSize={20 * scale}
            color="#FF5F1F"
            bgColor="#2a1400"
            style={{ paddingVertical: 12 * scale, paddingHorizontal: 16 * scale }}
            onPress={() => {
              api.horn();
              if (!online) playHorn();
              logEvent('horn');
            }}
          />
        </View>

        <TeamColumn
          info={game.away}
          increments={sport.increments}
          showSets={sport.sets}
          scale={scale}
          scoreFont={scoreFont}
          onBump={(d) => api.bump('away', d)}
          onBumpSets={(d) => api.bumpSets('away', d)}
          onEdit={() => setModal('away')}
        />
      </View>

      <EditTeamModal
        visible={modal === 'home' || modal === 'away'}
        team={modal === 'away' ? 'away' : 'home'}
        info={modal === 'away' ? game.away : game.home}
        onSave={(info) => api.setTeamInfo(modal, info)}
        onClose={() => setModal(null)}
      />
      <SportModal
        visible={modal === 'sport'}
        current={game.sport}
        onPick={(key) => {
          api.setSport(key);
          logEvent(`sport_${key}`);
        }}
        onClose={() => setModal(null)}
      />
      <TimerModal
        visible={modal === 'timer'}
        minutes={Math.round(game.timer.durationMs / 60000)}
        onPick={(m) => api.timerSetMinutes(m)}
        onClose={() => setModal(null)}
      />
      <SessionModal
        visible={modal === 'session'}
        status={session.status}
        code={session.code}
        error={session.error}
        connected={session.connected}
        clientCount={clientCount}
        isPro={ent.isPro}
        meter={meter}
        meterBlocked={meterBlocked}
        canHostHere={CAN_HOST_HERE}
        freeDays={FREE_REMOTE_DAYS_PER_MONTH}
        onStart={startSession}
        onProUnlocked={() => {
          refreshMeter();
          if (meterBlocked) startSession();
        }}
        onStop={() => confirmDialog('Stop session', 'Remotes will be disconnected.', stopSession)}
        onClose={() => setModal(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    width: '100%',
    height: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  backBtn: { padding: 6, minWidth: 80 },
  backText: { color: '#888', fontSize: 18 },
  topCenter: { flexDirection: 'row', alignItems: 'center' },
  clockGroup: { flexDirection: 'row', alignItems: 'center' },
  clockText: {
    color: 'white',
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  clockDone: { color: '#FF3131' },
  periodGroup: { flexDirection: 'row', alignItems: 'center' },
  periodText: { color: 'white', fontWeight: 'bold' },
  remoteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  remoteChipText: { color: 'white', fontSize: 16, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  middleCol: { alignItems: 'center' },
});

export default Scoreboard;
