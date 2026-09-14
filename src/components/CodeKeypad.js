import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// 4-digit code entry with a big friendly keypad (same idea as the watch app,
// so entering a code feels identical everywhere).
export default function CodeKeypad({ onSubmit, busy = false }) {
  const [digits, setDigits] = useState('');

  const press = (d) => {
    if (busy) return;
    if (d === 'del') {
      setDigits((s) => s.slice(0, -1));
      return;
    }
    if (d === 'go') {
      if (digits.length === 4) onSubmit(digits);
      return;
    }
    setDigits((s) => (s.length >= 4 ? s : s + d));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'go'];

  return (
    <View style={styles.wrap}>
      <View style={styles.slots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.slot, digits.length === i && styles.slotActive]}>
            <Text style={styles.slotText}>{digits[i] ?? ''}</Text>
          </View>
        ))}
      </View>
      <View style={styles.pad}>
        {keys.map((k) => (
          <TouchableOpacity
            key={k}
            style={[
              styles.key,
              k === 'go' && styles.keyGo,
              k === 'go' && digits.length !== 4 && styles.keyDisabled,
            ]}
            onPress={() => press(k)}
            activeOpacity={0.6}
          >
            <Text style={[styles.keyText, k === 'go' && styles.keyGoText]}>
              {k === 'del' ? '⌫' : k === 'go' ? 'Join' : k}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 18 },
  slots: { flexDirection: 'row', gap: 12 },
  slot: {
    width: 52,
    height: 64,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  slotActive: { borderColor: '#00FFFF' },
  slotText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 3 * 78 + 2 * 10,
    gap: 10,
    justifyContent: 'center',
  },
  key: {
    width: 78,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGo: { backgroundColor: '#0a84ff' },
  keyDisabled: { opacity: 0.4 },
  keyText: { color: 'white', fontSize: 26, fontWeight: '600' },
  keyGoText: { fontSize: 20 },
});
