import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const CustomButton = ({
  text,
  onPress,
  fontSize = 20,
  color = 'white',
  bgColor = 'transparent',
  disabled = false,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { borderColor: color, backgroundColor: bgColor, opacity: disabled ? 0.35 : 1 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <Text style={[styles.buttonText, { fontSize, color }, textStyle]}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default CustomButton;
