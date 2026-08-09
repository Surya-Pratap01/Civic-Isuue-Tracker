import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

/**
 * Simple mount-time reveal for React Native
 * - Fades in and slides up a bit
 * - Use for headers, cards, list rows (these mount as you scroll)
 */
export default function Reveal({ children, delay = 0, distance = 16, duration = 400, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
    Animated.timing(translateY, {
      toValue: 0,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [opacity, translateY, delay, duration]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}> 
      {children}
    </Animated.View>
  );
}
