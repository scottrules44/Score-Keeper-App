import { registerRootComponent } from 'expo';

import App from './App';

// Firebase Realtime Database (through at least @firebase/database 1.1.6) can
// call `this.realtime_.sendRequest()` from a timer after its connection has
// dropped, while `realtime_` is null. In release builds React Native treats
// that uncaught TypeError as fatal and the app aborts, even though Firebase
// reconnects on its own a moment later. Downgrade just that error to a warning.
const isFirebaseDisconnectRace = (error) => {
  const msg = String((error && error.message) || error || '');
  return /property 'sendRequest' of null|reading 'sendRequest'/.test(msg);
};

if (global.ErrorUtils && global.ErrorUtils.getGlobalHandler) {
  const defaultHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFirebaseDisconnectRace(error)) {
      console.warn('Ignored Firebase reconnect race:', error && error.message);
      return;
    }
    defaultHandler(error, isFatal);
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
