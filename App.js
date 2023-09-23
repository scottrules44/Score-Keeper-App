import { StyleSheet, Text, View } from 'react-native';
import Scoreboard from './Scoreboard';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Sign': require('./assets/sign.ttf'),
  });
  if (!fontsLoaded && !fontError) {
    return null;
  }
  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden={true} />
      <Scoreboard />
    </View>
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
