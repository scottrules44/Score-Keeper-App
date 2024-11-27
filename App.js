import { StyleSheet, Text, View } from 'react-native';
import Scoreboard from './Scoreboard';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Sign': require('./assets/fonts/sign.ttf'),
  });
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await NavigationBar.setVisibilityAsync("hidden");
      await SplashScreen.hideAsync();
      
    }
  }, [fontsLoaded, fontError]);
  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    };
    lockOrientation();
  
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);
  if (!fontsLoaded && !fontError) {
    return null;
  }
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container} onLayout={onLayoutRootView}>
        <StatusBar style="light" hidden={true} />
        <Scoreboard />
      </View>
    </SafeAreaView>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
