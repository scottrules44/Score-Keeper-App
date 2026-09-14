import { Platform } from 'react-native';
import { ref, update, increment } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, firebaseConfig } from './firebase';

// Optional: Google Analytics 4 Measurement Protocol.
// Create a secret in GA Admin -> Data streams -> (your stream) ->
// Measurement Protocol API secrets, paste it here, and events will also flow
// into Google Analytics. Leave empty to use only the built-in counters.
const GA4_API_SECRET = '';

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

// Fire-and-forget analytics. Counters live in the Realtime Database under
// /analytics (viewable in the Firebase console): totals per platform per
// event, plus a per-day breakdown for trends.
export function logEvent(event, params = {}) {
  const platform = Platform.OS; // ios | android | web
  try {
    update(ref(db), {
      [`analytics/totals/${platform}/${event}`]: increment(1),
      [`analytics/daily/${dayStamp()}/${platform}/${event}`]: increment(1),
    }).catch(() => {});
  } catch {}

  if (GA4_API_SECRET) {
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
