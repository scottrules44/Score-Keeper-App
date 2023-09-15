import { StyleSheet, Text, View } from 'react-native';
import Scoreboard from './Scoreboard';

export default function App() {
  return (
    <View style={styles.container}>
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
