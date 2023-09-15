import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import CustomButton from './CustomButton';
const Scoreboard = () => {
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);

  const increaseScore = (player) => {
    if (player === 1) {
      setPlayer1Score(player1Score + 1);
    } else {
      setPlayer2Score(player2Score + 1);
    }
  };

  const decreaseScore = (player) => {
    if (player === 1 && player1Score > 0) {
      setPlayer1Score(player1Score - 1);
    } else if (player === 2 && player2Score > 0) {
      setPlayer2Score(player2Score - 1);
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
            <Text style={{fontSize: 40, color: '#FF10F0', fontWeight: 'bold'}} >Home:</Text>
            <Text style={[ styles.scoreText, {color: '#FF10F0'} ]}>{player1Score}</Text>
          </View>
          <View style={styles.buttonContainer}>
            <CustomButton fontSize={60} text="+" onPress={() => increaseScore(1)} />
            <CustomButton fontSize={60} text="-" onPress={() => decreaseScore(1)} />
          </View>
        </View>
        <View style={styles.resetButton}>
          <CustomButton text="Reset Scores" fontSize={20} onPress={() => resetScores()} />
        </View>
        <View style={styles.scoreContainer}>
          <View style={styles.buttonContainer}>
            <CustomButton fontSize={60} text="+" onPress={() => increaseScore(2)} />
            <CustomButton fontSize={60} text="-" onPress={() => decreaseScore(2)} />
          </View>
          <View style={styles.score}>
            <Text style={{fontSize: 40, color: '#00FFFF', fontWeight: 'bold'}} >Away:</Text>
            <Text style={[styles.scoreText, {color: '#00FFFF'}]}>{player2Score}</Text>
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
    marginHorizontal: 30,
  },
  score: {
    display: 'flex',
    alignItems: 'center',
    width: 230,
  },
  scoreText: {
    color: 'white',
    fontSize: 220,
    fontWeight: 'bold',
  },
  buttonContainer: {
    gap: 20,
    marginTop: 10,
  },
  resetButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
});

export default Scoreboard;
