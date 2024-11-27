import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Device from 'expo-device';
const CustomButton = ({ text, bgColor='', fontSize = 80, onPress, isNormal =true }) => {
  const buttonStyle = {
    backgroundColor: bgColor,
  };

  return (
    <TouchableOpacity style={[styles.button, buttonStyle, (!isNormal&&{ width: Device.deviceType === 2 ? 300 : 200})]} onPress={onPress}>
      <Text style={[styles.buttonText, {fontSize}, (!isNormal?{ margin: -10} : { padding: 10})]}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  buttonText: {
    color: 'white',
  },
});

export default CustomButton;
