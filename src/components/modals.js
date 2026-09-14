import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import CustomButton from '../../CustomButton';
import { SPORTS, SPORT_KEYS, TEAM_COLORS } from '../sports';
import { WEB_REMOTE_URL } from '../config';

function Sheet({ visible, onClose, children, wide = false }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, wide && styles.sheetWide]}>
            {children}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

export function EditTeamModal({ visible, team, info, onSave, onClose }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(TEAM_COLORS[0]);

  useEffect(() => {
    if (visible && info) {
      setName(info.name);
      setColor(info.color);
    }
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{team === 'home' ? 'Home team' : 'Away team'}</Text>
      <TextInput
        style={[styles.input, { color }]}
        value={name}
        onChangeText={setName}
        maxLength={20}
        placeholder="Team name"
        placeholderTextColor="#666"
        autoCorrect={false}
      />
      <View style={styles.swatches}>
        {TEAM_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
            onPress={() => setColor(c)}
          />
        ))}
      </View>
      <View style={styles.row}>
        <CustomButton text="Cancel" onPress={onClose} color="#999" />
        <CustomButton
          text="Save"
          color="#39FF14"
          onPress={() => {
            onSave({ name: name.trim() || (team === 'home' ? 'Home' : 'Away'), color });
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

export function SportModal({ visible, current, onPick, onClose }) {
  return (
    <Sheet visible={visible} onClose={onClose} wide>
      <Text style={styles.title}>Sport</Text>
      <Text style={styles.hint}>Changing sport resets scores and the clock.</Text>
      <View style={styles.sportGrid}>
        {SPORT_KEYS.map((key) => {
          const s = SPORTS[key];
          const active = key === current;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.sportCell, active && styles.sportCellActive]}
              onPress={() => {
                onPick(key);
                onClose();
              }}
            >
              <Text style={styles.sportEmoji}>{s.emoji}</Text>
              <Text style={[styles.sportLabel, active && { color: '#00FFFF' }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Sheet>
  );
}

export function TimerModal({ visible, minutes, onPick, onClose }) {
  const presets = [5, 8, 10, 12, 15, 20, 30, 45];
  const [custom, setCustom] = useState('');
  useEffect(() => {
    if (visible) setCustom(String(minutes || ''));
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Clock length</Text>
      <View style={styles.swatches}>
        {presets.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.preset, m === minutes && styles.presetActive]}
            onPress={() => {
              onPick(m);
              onClose();
            }}
          >
            <Text style={styles.presetText}>{m}m</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { width: 110, textAlign: 'center' }]}
          value={custom}
          onChangeText={(t) => setCustom(t.replace(/[^0-9]/g, '').slice(0, 3))}
          keyboardType="number-pad"
          placeholder="min"
          placeholderTextColor="#666"
        />
        <CustomButton
          text="Set"
          color="#39FF14"
          disabled={!custom || Number(custom) < 1}
          onPress={() => {
            onPick(Number(custom));
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

export function SessionModal({
  visible,
  status,
  code,
  error,
  connected,
  clientCount = 0,
  isPro = false,
  meter = null,
  meterBlocked = false,
  canHostHere = true,
  freeDays = 4,
  onStart,
  onStop,
  onClose,
}) {
  const online = status === 'online' && code;

  const meterLine = isPro
    ? '⭐ Pro — unlimited remote days'
    : meter
      ? `Free plan: ${meter.usedThisMonth} of ${freeDays} remote days used this month`
      : null;

  return (
    <Sheet visible={visible} onClose={onClose} wide>
      <Text style={styles.title}>Remote control</Text>
      {online ? (
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Text style={styles.hint}>Enter this code on any remote — or scan to open the web remote:</Text>
          <Text style={styles.code}>{code}</Text>
          <View style={styles.qrBox}>
            <QRCode value={`${WEB_REMOTE_URL}?code=${code}`} size={130} backgroundColor="white" />
          </View>
          <Text style={styles.hintSmall}>
            📱 Sports Score Tracker app → Remote{'\n'}⌚ Apple Watch app{'\n'}🌐{' '}
            {WEB_REMOTE_URL.replace('https://', '')}
          </Text>
          <Text style={styles.clients}>
            {clientCount > 0
              ? `👤 ${clientCount} remote${clientCount === 1 ? '' : 's'} connected`
              : 'No remotes connected yet'}
          </Text>
          {!!meterLine && <Text style={styles.meterLine}>{meterLine}</Text>}
          {!connected && <Text style={styles.warn}>Reconnecting…</Text>}
          <CustomButton text="Stop remote session" color="#FF3131" onPress={onStop} />
        </View>
      ) : !canHostHere ? (
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Text style={styles.hint}>
            Hosting live sessions is available in the iPhone, iPad, and Android app. This
            browser can still join any scoreboard as a remote:
          </Text>
          <Text style={styles.hintSmall}>🌐 {WEB_REMOTE_URL.replace('https://', '')}</Text>
        </View>
      ) : meterBlocked ? (
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Text style={styles.lockEmoji}>🔒</Text>
          <Text style={styles.hint}>
            You've used all {freeDays} free remote days this month. The scoreboard itself
            stays fully usable — free remote days reset on the 1st.
          </Text>
          <Text style={styles.proPitch}>
            ⭐ Pro removes the limit: unlimited remote days for your watch, phones, and web
            remotes. One-time purchase — coming soon in this app.
          </Text>
          {!!meterLine && <Text style={styles.meterLine}>{meterLine}</Text>}
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Text style={styles.hint}>
            Start a session to control this scoreboard from an iPhone, Apple Watch, or any
            browser. You'll get a 4-digit code remotes use to connect.
          </Text>
          {status === 'connecting' ? (
            <ActivityIndicator color="#00FFFF" size="large" />
          ) : (
            <CustomButton text="Start remote session" color="#39FF14" fontSize={22} onPress={onStart} />
          )}
          {!!meterLine && <Text style={styles.meterLine}>{meterLine}</Text>}
          {!!error && <Text style={styles.warn}>{error}</Text>}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: '#161618',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    padding: 22,
    gap: 14,
    minWidth: 320,
    maxWidth: 460,
    alignItems: 'center',
  },
  sheetWide: { maxWidth: 560 },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  hint: { color: '#bbb', fontSize: 15, textAlign: 'center', lineHeight: 21 },
  hintSmall: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  warn: { color: '#FF5F1F', fontSize: 14, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 22,
    color: 'white',
    minWidth: 220,
    backgroundColor: '#0c0c0d',
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    maxWidth: 320,
  },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'transparent' },
  swatchActive: { borderColor: 'white' },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  sportCell: {
    width: 110,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    gap: 4,
  },
  sportCellActive: { backgroundColor: '#003035', borderWidth: 1, borderColor: '#00FFFF' },
  sportEmoji: { fontSize: 30 },
  sportLabel: { color: '#ddd', fontSize: 14, fontWeight: '600' },
  code: { color: '#39FF14', fontSize: 64, fontWeight: 'bold', letterSpacing: 10 },
  clients: { color: '#00FFFF', fontSize: 15, fontWeight: '600' },
  meterLine: { color: '#777', fontSize: 13 },
  lockEmoji: { fontSize: 44 },
  proPitch: {
    color: '#FFD60A',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  qrBox: { padding: 10, backgroundColor: 'white', borderRadius: 10 },
  preset: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1c1c1e',
  },
  presetActive: { backgroundColor: '#003035', borderWidth: 1, borderColor: '#00FFFF' },
  presetText: { color: 'white', fontSize: 18, fontWeight: '600' },
});
