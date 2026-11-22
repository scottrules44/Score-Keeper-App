import { Platform } from 'react-native';

// JS side of the StoreKit 2 bridge (iOS only). Everywhere else — Android,
// web, Expo Go — `available` is false and the app hides the purchase UI.
let native = null;
if (Platform.OS === 'ios') {
  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    native = requireOptionalNativeModule ? requireOptionalNativeModule('ProStore') : null;
  } catch {
    native = null;
  }
}

export const available = !!native;

export const getProduct = (id) => (native ? native.getProduct(id) : Promise.resolve(null));
export const isEntitled = (id) => (native ? native.isEntitled(id) : Promise.resolve(false));
export const purchase = (id) =>
  native ? native.purchase(id) : Promise.reject(new Error('Purchases are not available here.'));
export const restore = (id) => (native ? native.restore(id) : Promise.resolve(false));

export function addProListener(fn) {
  if (!native || !native.addListener) return () => {};
  const sub = native.addListener('onProChanged', fn);
  return () => sub.remove();
}
