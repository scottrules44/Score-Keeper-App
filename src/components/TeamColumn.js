import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import CustomButton from '../../CustomButton';

// One side of the scoreboard: name, a big +1 button, then the giant score —
// which is ALSO a +1 tap target — with corrections/multi-point buttons below.
// On native the score is sized from the measured free space, so every screen
// size gets the biggest possible digits. (adjustsFontSizeToFit can't be used
// for this: on the new architecture it never grows text past 96pt, which left
// the score tiny on iPad.)

// Advance widths of the 'Sign' font in em (measured from assets/fonts/sign.ttf).
const DIGIT_EM = 0.49;
const ONE_EM = 0.26;
// Digits only use ~0.6em of the font's 1.06em line box, so the score gets a
// tighter line height and is sized against that instead.
const LINE_EM = 0.86;

function fitScoreFont(text, box, hintHeight) {
  if (!box) return null;
  const chars = String(text);
  let widthEm = 0;
  for (const c of chars) widthEm += c === '1' ? ONE_EM : DIGIT_EM;
  widthEm = Math.max(widthEm, DIGIT_EM);
  const byWidth = (box.width - 8) / widthEm;
  const byHeight = (box.height - hintHeight) / LINE_EM;
  return Math.max(24, Math.floor(Math.min(byWidth, byHeight) * 0.99));
}
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
  const native = Platform.OS !== 'web';
  const [box, setBox] = useState(null);
  const hintSize = 11 * scale;
  const fitted = native ? fitScoreFont(info.score, box, hintSize * 1.6) : null;
  // Until the first layout pass reports the box, fall back to auto-fit.
  const autoFit = native && fitted == null;

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
        onLayout={
          native
            ? (e) => {
                const { width, height } = e.nativeEvent.layout;
                setBox((b) =>
                  b && Math.abs(b.width - width) < 1 && Math.abs(b.height - height) < 1
                    ? b
                    : { width, height }
                );
              }
            : undefined
        }
      >
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit={autoFit}
          minimumFontScale={0.2}
          style={[
            styles.score,
            {
              color,
              fontSize: fitted ?? (autoFit ? 640 * scale : scoreFont),
              ...(fitted ? { lineHeight: Math.round(fitted * LINE_EM) } : {}),
              transform: [{ scale: pulse }],
            },
          ]}
        >
          {info.score}
        </Animated.Text>
        <Text style={[styles.hint, { fontSize: hintSize }]}>tap +1</Text>
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
    paddingHorizontal: 4,
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
