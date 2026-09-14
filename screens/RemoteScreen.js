import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../CustomButton';
import CodeKeypad from '../src/components/CodeKeypad';
import { useRoom } from '../src/useRoom';
import { getSport, formatClock, timerDisplayMs } from '../src/sports';
import { logEvent } from '../src/analytics';

const REMOTE_CODE_KEY = 'sk:remoteCode';

// The whole card is the +1 button; corrections and multi-point plays are the
// smaller buttons underneath.
function TeamPad({ info, increments, showSets, scale, scoreFont, onBump, onBumpSets }) {
  const color = info.color || 'white';
  const extraIncs = increments.filter((i) => i !== 1);
  return (
    <TouchableOpacity
      style={[styles.teamPad, { borderColor: color, paddingVertical: 16 * scale }]}
      activeOpacity={0.65}
      onPress={() => onBump(1)}
    >
      <Text
        style={[styles.teamName, { color, fontSize: 22 * scale }]}
        numberOfLines={1}
      >
        {info.name}
      </Text>
      <CustomButton
        text="+"
        fontSize={28 * scale}
        color={color}
        style={{ minWidth: 120 * scale, paddingVertical: 0 }}
        onPress={() => onBump(1)}
      />
      <Text style={[styles.teamScore, { color, fontSize: scoreFont }]}>{info.score}</Text>
      <Text style={[styles.hint, { fontSize: 12 * scale }]}>tap +1</Text>
      <View style={[styles.btnRow, { gap: 8 * scale }]}>
        <CustomButton
          text="−"
          fontSize={28 * scale}
          color={color}
          style={{ minWidth: 84 * scale, paddingVertical: 2 * scale }}
          onPress={() => onBump(-1)}
        />
        {extraIncs.map((inc) => (
          <CustomButton
            key={inc}
            text={`+${inc}`}
            fontSize={22 * scale}
            color={color}
            style={{ minWidth: 62 * scale, paddingVertical: 6 * scale }}
            onPress={() => onBump(inc)}
          />
        ))}
      </View>
      {showSets && (
        <View style={[styles.btnRow, { gap: 10 * scale, marginTop: 8 * scale }]}>
          <CustomButton text="−" fontSize={16 * scale} color={color} onPress={() => onBumpSets(-1)} />
          <Text style={{ color, fontSize: 17 * scale, fontWeight: 'bold' }}>
            Sets {info.sets || 0}
          </Text>
          <CustomButton text="+" fontSize={16 * scale} color={color} onPress={() => onBumpSets(1)} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function RemoteScreen({ onBack }) {
  const session = useRoom();
  const { width, height } = useWindowDimensions();
  const [lastCode, setLastCode] = useState(null);
  const [clockMs, setClockMs] = useState(0);

  const online = session.status === 'online' && !!session.game;
  const game = session.game;
  const sport = game ? getSport(game.sport) : null;

  const scale = Math.max(0.9, Math.min(width / 400, height / 720, 2.2));
  const scoreFont = Math.min(width * 0.3, height * 0.24, 210 * scale);

  useEffect(() => {
    AsyncStorage.getItem(REMOTE_CODE_KEY)
      .then((c) => c && setLastCode(c))
      .catch(() => {});
  }, []);

  const tryJoin = async (code) => {
    const ok = await session.join(code);
    if (ok) {
      AsyncStorage.setItem(REMOTE_CODE_KEY, code).catch(() => {});
      setLastCode(code);
      logEvent('remote_joined');
    }
  };

  // Tick the clock display; the host owns stopping it at zero.
  useEffect(() => {
    if (!game) return undefined;
    const compute = () => timerDisplayMs(game.timer, session.serverNow());
    setClockMs(compute());
    if (!game.timer.running) return undefined;
    const id = setInterval(() => setClockMs(compute()), 250);
    return () => clearInterval(id);
  }, [game?.timer, session.serverNow]);

  // ---- join screen --------------------------------------------------------
  if (!online) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Menu</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Remote Control</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.joinBody}>
          <Text style={styles.joinHint}>
            Enter the 4-digit code shown on the scoreboard{'\n'}(tap “Remote” on the board to see
            it)
          </Text>
          {session.status === 'connecting' ? (
            <ActivityIndicator size="large" color="#00FFFF" style={{ marginVertical: 40 }} />
          ) : (
            <CodeKeypad onSubmit={tryJoin} />
          )}
          {session.status === 'ended' && (
            <Text style={styles.warn}>The scoreboard ended the session.</Text>
          )}
          {!!session.error && <Text style={styles.warn}>{session.error}</Text>}
          {lastCode && session.status !== 'connecting' && (
            <CustomButton
              text={`Rejoin ${lastCode}`}
              fontSize={18}
              color="#00FFFF"
              onPress={() => tryJoin(lastCode)}
            />
          )}
        </ScrollView>
      </View>
    );
  }

  // ---- control screen -----------------------------------------------------
  const hostAway = game.hostOnline === false;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => session.leave()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Leave</Text>
        </TouchableOpacity>
        <View style={styles.codeChip}>
          <View
            style={[styles.dot, { backgroundColor: session.connected ? '#39FF14' : '#FF5F1F' }]}
          />
          <Text style={styles.codeChipText}>{session.code}</Text>
        </View>
        <Text style={styles.sportTag}>
          {sport.emoji} {sport.label}
        </Text>
      </View>

      {hostAway && (
        <Text style={styles.hostAway}>
          ⚠️ Scoreboard is offline — it will catch up when it reconnects.
        </Text>
      )}

      <ScrollView contentContainerStyle={[styles.controlBody, { gap: 16 * scale }]}>
        <View style={[styles.padsRow, { gap: 14 * scale }]}>
          <TeamPad
            info={game.home}
            increments={sport.increments}
            showSets={sport.sets}
            scale={scale}
            scoreFont={scoreFont}
            onBump={(d) => session.actions.bump('home', d)}
            onBumpSets={(d) => session.actions.bumpSets('home', d)}
          />
          <TeamPad
            info={game.away}
            increments={sport.increments}
            showSets={sport.sets}
            scale={scale}
            scoreFont={scoreFont}
            onBump={(d) => session.actions.bump('away', d)}
            onBumpSets={(d) => session.actions.bumpSets('away', d)}
          />
        </View>

        <View style={styles.midRow}>
          <View style={[styles.group, { gap: 8 * scale }]}>
            <Text style={[styles.groupLabel, { fontSize: 21 * scale }]}>
              {sport.periodLabel} {game.period}
            </Text>
            <View style={[styles.groupRow, { gap: 12 * scale }]}>
              <CustomButton
                text="−"
                fontSize={22 * scale}
                style={{ paddingHorizontal: 18 * scale, paddingVertical: 8 * scale }}
                onPress={() => session.actions.setPeriod(-1)}
              />
              <CustomButton
                text="+"
                fontSize={22 * scale}
                style={{ paddingHorizontal: 18 * scale, paddingVertical: 8 * scale }}
                onPress={() => session.actions.setPeriod(1)}
              />
            </View>
          </View>

          {sport.timer.enabled && (
            <View style={[styles.group, { gap: 8 * scale }]}>
              <Text style={[styles.groupLabel, styles.clock, { fontSize: 28 * scale }]}>
                {formatClock(clockMs)}
              </Text>
              <View style={[styles.groupRow, { gap: 12 * scale }]}>
                <CustomButton
                  text={game.timer.running ? '⏸' : '▶'}
                  fontSize={22 * scale}
                  color={game.timer.running ? '#FFFF00' : '#39FF14'}
                  style={{ paddingHorizontal: 18 * scale, paddingVertical: 8 * scale }}
                  onPress={() =>
                    game.timer.running
                      ? session.actions.timerPause()
                      : session.actions.timerStart()
                  }
                />
                <CustomButton
                  text="↺"
                  fontSize={22 * scale}
                  color="#999"
                  style={{ paddingHorizontal: 18 * scale, paddingVertical: 8 * scale }}
                  onPress={() => session.actions.timerReset()}
                />
              </View>
            </View>
          )}
        </View>

        <View style={[styles.bottomRow, { gap: 12 * scale }]}>
          <CustomButton
            text="📢 HORN"
            fontSize={22 * scale}
            color="#FF5F1F"
            bgColor="#2a1400"
            style={{ flex: 1, paddingVertical: 14 * scale }}
            onPress={() => {
              session.actions.horn();
              logEvent('horn');
            }}
          />
          <CustomButton
            text="Reset"
            fontSize={16 * scale}
            color="#999"
            style={{ paddingVertical: 14 * scale }}
            onPress={() => session.actions.resetGame()}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { minWidth: 70 },
  backText: { color: '#888', fontSize: 17 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  joinBody: { alignItems: 'center', gap: 20, paddingVertical: 20, paddingHorizontal: 16 },
  joinHint: { color: '#999', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  warn: { color: '#FF5F1F', fontSize: 15, textAlign: 'center' },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  codeChipText: { color: 'white', fontSize: 17, fontWeight: '700', letterSpacing: 2 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  sportTag: { color: '#999', fontSize: 14, minWidth: 70, textAlign: 'right' },
  hostAway: {
    color: '#FF5F1F',
    textAlign: 'center',
    fontSize: 13,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  controlBody: { padding: 14, flexGrow: 1, justifyContent: 'center' },
  padsRow: { flexDirection: 'row' },
  teamPad: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0b0b0c',
  },
  teamName: { fontWeight: 'bold', maxWidth: '92%' },
  teamScore: { fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: undefined },
  hint: { color: '#555' },
  btnRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  midRow: { flexDirection: 'row', justifyContent: 'space-around' },
  group: { alignItems: 'center' },
  groupLabel: { color: 'white', fontWeight: 'bold' },
  clock: { fontVariant: ['tabular-nums'] },
  groupRow: { flexDirection: 'row' },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
});
