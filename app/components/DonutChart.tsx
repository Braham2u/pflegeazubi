import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BRAND } from '../constants/colors';

interface Props {
  worked: number;
  contracted: number;
  color?: string;
  size?: number;
}

// Pure React Native donut — no SVG dependency, works on web + native
export default function DonutChart({ worked, contracted, color = BRAND.primary, size = 150 }: Props) {
  const pct = contracted > 0 ? Math.min(worked / contracted, 1) : 0;
  const strokeW = 14;
  const inner = size - strokeW * 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track ring */}
      <View style={[styles.ring, {
        width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeW, borderColor: '#E5E7EB',
        position: 'absolute',
      }]} />
      {/* Progress arc — simulate with two half-circle clips */}
      {pct > 0 && (
        <View style={{ width: size, height: size, position: 'absolute', borderRadius: size / 2, overflow: 'hidden' }}>
          {/* Left half */}
          <View style={{ position: 'absolute', width: size / 2, height: size, left: 0, overflow: 'hidden' }}>
            <View style={[{
              width: size, height: size, borderRadius: size / 2,
              borderWidth: strokeW, borderColor: 'transparent',
              borderLeftColor: pct >= 0.5 ? color : 'transparent',
              borderBottomColor: pct >= 0.25 ? color : 'transparent',
              position: 'absolute', left: 0,
              transform: [{ rotate: `${Math.max(0, (pct - 0.5) * 360)}deg` }],
            }]} />
          </View>
          {/* Right half */}
          <View style={{ position: 'absolute', width: size / 2, height: size, right: 0, overflow: 'hidden' }}>
            <View style={[{
              width: size, height: size, borderRadius: size / 2,
              borderWidth: strokeW, borderColor: 'transparent',
              borderRightColor: pct >= 0 ? color : 'transparent',
              borderTopColor: pct >= 0.75 ? color : 'transparent',
              position: 'absolute', right: 0,
              transform: [{ rotate: `${Math.min(pct * 360, 180) - 180}deg` }],
            }]} />
          </View>
        </View>
      )}
      {/* Center label */}
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.14, fontWeight: '800', color: '#111827' }}>
          {Math.round(worked)}h
        </Text>
        <Text style={{ fontSize: size * 0.08, color: '#6B7280', marginTop: 2 }}>
          / {contracted}h
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {},
});
