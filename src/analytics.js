import { Platform } from 'react-native';
import { ref, update, increment } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import app, { db, firebaseConfig } from './firebase';
import NativeAnalytics from '../modules/firebase-analytics';

// Google Analytics for Firebase:
// - iOS: native Firebase Analytics SDK (modules/firebase-analytics), which
//   also records sessions, retention, app version, device and country on its own.
// - Web: Firebase JS Analytics (same GA4 property, measurementId above).
// - Android: optional GA4 Measurement Protocol (paste a secret below).
// Events show in Firebase console -> Analytics -> Events.

// Android only: GA Admin -> Data streams -> (stream) -> Measurement Protocol
// API secrets. Leave empty to skip.
const GA4_API_SECRET = '';

let webAnalytics = null;
if (Platform.OS === 'web') {
  import('firebase/analytics')
    .then(async ({ getAnalytics, isSupported, logEvent: webLog }) => {
      if (await isSupported()) {
        const a = getAnalytics(app);
        webAnalytics = (name, params) => webLog(a, name, params);
      }
    })
    .catch(() => {});
}

let cachedClientId = null;
async function getClientId() {
  if (cachedClientId) return cachedClientId;
  try {
    let id = await AsyncStorage.getItem('sk:cid');
    if (!id) {
      id = `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
      await AsyncStorage.setItem('sk:cid', id);
    }
    cachedClientId = id;
  } catch {
    cachedClientId = `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
  }
  return cachedClientId;
}

function dayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

// Fire-and-forget. Also keeps the simple Realtime Database counters under
// /analytics (totals + per day, per platform) so existing numbers continue.
export function logEvent(event, params = {}) {
  const platform = Platform.OS; // ios | android | web

  try {
    if (NativeAnalytics) NativeAnalytics.logEvent(event, params);
    else if (webAnalytics) webAnalytics(event, { platform, ...params });
  } catch {}

  try {
    update(ref(db), {
      [`analytics/totals/${platform}/${event}`]: increment(1),
      [`analytics/daily/${dayStamp()}/${platform}/${event}`]: increment(1),
    }).catch(() => {});
  } catch {}

  if (GA4_API_SECRET && platform === 'android') {
    (async () => {
      try {
        const clientId = await getClientId();
        await fetch(
          `https://www.google-analytics.com/mp/collect?measurement_id=${firebaseConfig.measurementId}&api_secret=${GA4_API_SECRET}`,
          {
            method: 'POST',
            body: JSON.stringify({
              client_id: clientId,
              events: [{ name: event, params: { platform, ...params } }],
            }),
          }
        );
      } catch {}
    })();
  }
}

// Segment users in Firebase Analytics (e.g. is_pro = "true").
export function setUserProperty(name, value) {
  try {
    if (NativeAnalytics) NativeAnalytics.setUserProperty(name, value == null ? null : String(value));
  } catch {}
}

export function logScreen(screen) {
  try {
    if (NativeAnalytics) NativeAnalytics.logScreenView(screen);
    else if (webAnalytics) webAnalytics('screen_view', { screen_name: screen });
  } catch {}
}
