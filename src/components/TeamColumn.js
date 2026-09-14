import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import CustomButton from '../../CustomButton';

// One side of the scoreboard: name, a big +1 button, then the giant score —
// which is ALSO a +1 tap target — with corrections/multi-point buttons below.
// On native the score auto-fits the free space, so every screen size gets the
// biggest possible digits.
export default function TeamColumn({
  info,
  increments,
  showSets,
  scale,
  scoreFont,
  editable = true,
  onBump,
  onBumpSets,
  onEdit,
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    pulse.setValue(1.12);
    Animated.spring(pulse, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  }, [info.score]);

  const color = info.color || 'white';
  const extraIncs = increments.filter((i) => i !== 1);
  const autoFit = Platform.OS !== 'web';

  return (
    <View style={styles.col}>
      <TouchableOpacity onPress={onEdit} disabled={!editable}>
        <Text style={[styles.name, { color, fontSize: 28 * scale }]} numberOfLines={1}>
          {info.name}
          {editable ? ' ✎' : ''}
        </Text>
      </TouchableOpacity>

      <CustomButton
        text="+"
        fontSize={34 * scale}
        color={color}
        style={{ minWidth: 170 * scale, paddingVertical: 0, marginTop: 6 * scale }}
        onPress={() => onBump(1)}
      />

      <TouchableOpacity
        style={styles.scoreTap}
        activeOpacity={0.65}
        onPress={() => onBump(1)}
      >
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit={autoFit}
          minimumFontScale={0.2}
          style={[
            styles.score,
            { color, fontSize: autoFit ? 640 * scale : scoreFont, transform: [{ scale: pulse }] },
          ]}
        >
          {info.score}
        </Animated.Text>
        <Text style={[styles.hint, { fontSize: 11 * scale }]}>tap +1</Text>
      </TouchableOpacity>

      <View style={[styles.bottomRow, { gap: 10 * scale }]}>
        <CustomButton
          text="−"
          fontSize={30 * scale}
          color={color}
          style={{ minWidth: 100 * scale, paddingVertical: 2 * scale }}
          onPress={() => onBump(-1)}
        />
        {extraIncs.map((inc) => (
          <CustomButton
            key={inc}
            text={`+${inc}`}
            fontSize={24 * scale}
            color={color}
            style={{ minWidth: 70 * scale, paddingVertical: 5 * scale }}
            onPress={() => onBump(inc)}
          />
        ))}
      </View>

      {showSets && (
        <View style={[styles.setsRow, { marginTop: 10 * scale }]}>
          <CustomButton text="−" fontSize={17 * scale} color={color} onPress={() => onBumpSets(-1)} />
          <Text style={[styles.setsText, { color, fontSize: 21 * scale }]}>
            Sets {info.sets || 0}
          </Text>
          <CustomButton text="+" fontSize={17 * scale} color={color} onPress={() => onBumpSets(1)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  col: { alignItems: 'center', flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  name: { fontWeight: 'bold', maxWidth: 320 },
  scoreTap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    flexShrink: 1,
    flexGrow: 1,
    paddingHorizontal: 12,
  },
  score: {
    fontFamily: 'Sign',
    textAlign: 'center',
    width: '100%',
    ...(Platform.OS === 'web' ? {} : { flexShrink: 1 }),
  },
  hint: { color: '#555', marginTop: -2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  setsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  setsText: { fontWeight: 'bold' },
});
