import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase project: sports-score-keeper
// NOTE: the Realtime Database instance must exist (Firebase Console -> Build ->
// Realtime Database -> Create Database, United States region) for sync to work.
export const DATABASE_URL = 'https://sports-score-keeper-default-rtdb.firebaseio.com';

export const firebaseConfig = {
  apiKey: 'AIzaSyByrVDVRX8uDAFikvlkMG3uu7Jlyr6F7kw',
  authDomain: 'sports-score-keeper.firebaseapp.com',
  databaseURL: DATABASE_URL,
  projectId: 'sports-score-keeper',
  storageBucket: 'sports-score-keeper.firebasestorage.app',
  messagingSenderId: '342571857973',
  appId: '1:342571857973:web:4b39266be5d94274f2597c',
  measurementId: 'G-WEL1DEMS23',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getDatabase(app, DATABASE_URL);
export default app;
