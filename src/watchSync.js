import { Platform } from 'react-native';

// Pushes the active session code to the paired Apple Watch so the watch app
// connects by itself — no code typing. Uses WatchConnectivity application
// context, which is delivered even if the watch app is closed at the time.
let wc = null;
if (Platform.OS === 'ios') {
  try {
    wc = require('react-native-watch-connectivity');
  } catch {
    wc = null;
  }
}

export function pushSessionCode(code) {
  if (!wc) return;
  try {
    wc.updateApplicationContext({ code: code || '' });
  } catch {}
}
