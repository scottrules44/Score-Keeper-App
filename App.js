import { StyleSheet, View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Scoreboard from './Scoreboard';
import MenuScreen from './screens/MenuScreen';
import RemoteScreen from './screens/RemoteScreen';
import { logEvent } from './src/analytics';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [mode, setMode] = useState('menu'); // menu | board | remote
  const [fontsLoaded, fontError] = useFonts({
    Sign: require('./assets/fonts/sign.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync('hidden');
        } catch {}
      }
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    logEvent('app_open');
  }, []);

  // The board demands landscape; menu and remote rotate freely.
  useEffect(() => {
    (async () => {
      try {
        if (mode === 'board') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
          await ScreenOrientation.unlockAsync();
        }
      } catch {}
    })();
  }, [mode]);

  // Never let the screen sleep mid-game.
  useEffect(() => {
    if (mode === 'menu') {
      deactivateKeepAwake().catch?.(() => {});
      return undefined;
    }
    activateKeepAwakeAsync().catch(() => {});
    return () => {
      deactivateKeepAwake().catch?.(() => {});
    };
  }, [mode]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // SafeAreaView doesn't track window resizes on web; plain View is fine there.
  const Frame = Platform.OS === 'web' ? View : SafeAreaView;

  return (
    <SafeAreaProvider>
      <Frame style={styles.safe}>
        <View style={styles.container} onLayout={onLayoutRootView}>
          <StatusBar style="light" hidden={mode === 'board'} />
          {mode === 'menu' && <MenuScreen onPick={setMode} />}
          {mode === 'board' && <Scoreboard onBack={() => setMode('menu')} />}
          {mode === 'remote' && <RemoteScreen onBack={() => setMode('menu')} />}
        </View>
      </Frame>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'black' },
  container: { flex: 1, backgroundColor: 'black' },
});
