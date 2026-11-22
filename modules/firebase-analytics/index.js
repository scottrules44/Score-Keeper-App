import { Platform } from 'react-native';

// Native Google Analytics for Firebase (iOS). null elsewhere.
let native = null;
if (Platform.OS === 'ios') {
  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    native = requireOptionalNativeModule ? requireOptionalNativeModule('FirebaseAnalytics') : null;
  } catch {
    native = null;
  }
}
export default native;
