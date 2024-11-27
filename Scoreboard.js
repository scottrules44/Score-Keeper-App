import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import CustomButton from './CustomButton';
import { Audio } from 'expo-av';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from "firebase/database";
import * as Device from 'expo-device';
// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBouW3qRDbDGIGreQj1Gk0-kBWZtLqzCc0",
  authDomain: "corona-sdk-4-82825584.firebaseapp.com",
  databaseURL: "https://corona-sdk-4-82825584.firebaseio.com",
  projectId: "corona-sdk-4-82825584",
  storageBucket: "corona-sdk-4-82825584.appspot.com",
  messagingSenderId: "652763858765",
  appId: "1:652763858765:web:68320c1e0dec341d095904",
  measurementId: "G-CHT4LV5J43"
};

const app = initializeApp(firebaseConfig);

const database = getDatabase(app);

const Scoreboard = () => {
  const [sound, setSound] = useState();
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync(); // Unload the sound when the component unmounts
        }
      : undefined;
  }, [sound]);


  const playSound = async () => {
    if(soundOn) return;
    const { sound } = await Audio.Sound.createAsync(
      require('./assets/beep.wav')
    );
    setSound(sound);
    await sound.playAsync(); // Play the loaded audio
  };
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const matchScore = ref(database, 'matchScore');
  useEffect(() => {
    onValue(matchScore, (snapshot) => {
      const data = snapshot.val();
      setPlayer1Score((oldScore)=>{
        if(oldScore !== data?.player1){
          playSound();
        }
        return data?.player1 ?? 0});
      setPlayer2Score((oldScore)=>{
        if(oldScore !== data?.player2){
          playSound();
        }
        return data?.player2 ?? 0});
    });
  }, []);

  const increaseScore = (player) => {
    playSound();
    if (player === 1) {
      setPlayer1Score(player1Score + 1);
      update(ref(database, 'matchScore'), {
        player1: player1Score+1,
      });
    } else {
      setPlayer2Score(player2Score + 1);
      update(ref(database, 'matchScore'), {
        player2: player2Score+1,
      });
    }

  };

  const decreaseScore = (player) => {
    playSound();
    if (player === 1 && player1Score > 0) {
      setPlayer1Score(player1Score - 1);
      update(ref(database, 'matchScore'), {
        player1: player1Score - 1,
      });
    } else if (player === 2 && player2Score > 0) {
      setPlayer2Score(player2Score - 1);
      update(ref(database, 'matchScore'), {
        player2: player2Score - 1,
      });
    }

  };

  const resetScores = () => {
    Alert.alert(
      'Score Reset',
      'Are you sure you want to reset the scores?',
      [
        { text: 'Yes', onPress: () => {
          setPlayer1Score(0);
          setPlayer2Score(0);
          update(ref(database, 'matchScore'), {
            player1: 0,
            player2: 0,
          });
        } },
        {
          text: 'No',
          onPress: () => {},
          style: 'cancel',
        },
      ],
    );
  };
  return (
    <View style={styles.container}>
      <View style={styles.scores}>
        <View style={styles.scoreContainer}>
          <View style={styles.score}>
            <CustomButton fontSize={Device.deviceType === 2 ? 100 : 50} text="+" isNormal={false} onPress={() => increaseScore(1)} />
            <Text style={{fontSize: 40, color: '#FF10F0', fontWeight: 'bold'}} >Home:</Text>
            <Text style={[ styles.scoreText, {color: '#FF10F0'} ]}>{player1Score}</Text>
            <CustomButton fontSize={Device.deviceType === 2 ? 100 : 50} text="-" isNormal={false} onPress={() => decreaseScore(1)} />
          </View>
        </View>
        <View style={styles.middleButtons}>
          <CustomButton text="Reset Scores" fontSize={20} onPress={() => resetScores()} />
          <CustomButton text={soundOn ? "Sound On" : "Sound Off"} fontSize={20} onPress={() => setSoundOn(!soundOn)} />
        </View>
        <View style={styles.scoreContainer}>
          <View style={styles.score}>
            <CustomButton fontSize={Device.deviceType === 2 ? 100 : 50} text="+" isNormal={false} onPress={() => increaseScore(2)} />
            <Text style={{fontSize: 40, color: '#00FFFF', fontWeight: 'bold'}} >Away:</Text>
            <Text style={[styles.scoreText, {color: '#00FFFF'}]}>{player2Score}</Text>
            <CustomButton fontSize={Device.deviceType === 2 ? 100 : 50} text="-" isNormal={false} onPress={() => decreaseScore(2)} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor:'black',
    width:'100%',
    height:'100%',
  },
  heading: {
    fontSize: 24,
    marginBottom: 20,
  },
  scoreContainer: {
    display:'flex',
    flexDirection:'row',
    gap: 40,
    alignItems:'center',
  },
  scores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  score: {
    display: 'flex',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scoreText: {
    color: 'white',
    fontSize: Device.deviceType === 2 ? 320 : 200,
    fontFamily: 'Sign',
  },
  buttonContainer: {
    gap: 20,
    marginTop: 10,
  },
  middleButtons: {
    marginTop: 20,
    alignSelf: 'center',
    gap: 20,
  },
});

export default Scoreboard;
