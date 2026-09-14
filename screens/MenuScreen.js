import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { APP_VERSION, WEB_REMOTE_URL } from '../src/config';

export default function MenuScreen({ onPick }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sports Score Tracker</Text>
      <Text style={styles.subtitle}>Scoreboard on the big screen. Remote in your pocket.</Text>

      <View style={styles.cards}>
        <TouchableOpacity style={styles.card} onPress={() => onPick('board')} activeOpacity={0.7}>
          <Text style={styles.cardEmoji}>🏟</Text>
          <Text style={styles.cardTitle}>Scoreboard</Text>
          <Text style={styles.cardHint}>Run the game on this device</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => onPick('remote')} activeOpacity={0.7}>
          <Text style={styles.cardEmoji}>🎮</Text>
          <Text style={styles.cardTitle}>Remote Control</Text>
          <Text style={styles.cardHint}>Join a scoreboard with a code</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Also on Apple Watch and the web: {WEB_REMOTE_URL.replace('https://', '')}
      </Text>
      <Text style={styles.version}>v{APP_VERSION}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  title: { color: 'white', fontSize: 44, fontFamily: 'Sign', textAlign: 'center' },
  subtitle: { color: '#888', fontSize: 16, textAlign: 'center', marginBottom: 18 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'center' },
  card: {
    backgroundColor: '#151517',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    paddingVertical: 26,
    paddingHorizontal: 30,
    alignItems: 'center',
    gap: 6,
    minWidth: 230,
  },
  cardEmoji: { fontSize: 44 },
  cardTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  cardHint: { color: '#999', fontSize: 14 },
  footer: { color: '#666', fontSize: 13, marginTop: 26, textAlign: 'center' },
  version: { color: '#444', fontSize: 12 },
});
