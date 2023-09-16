import { StyleSheet, Text, View } from 'react-native';
import Scoreboard from './Scoreboard';
import { StatusBar } from 'expo-status-bar';
export default function App() {
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
