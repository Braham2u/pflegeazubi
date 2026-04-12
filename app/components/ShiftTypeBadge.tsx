import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShiftType } from '../types';
import { SHIFT_COLORS } from '../constants/colors';

interface Props {
  shiftType: ShiftType;
}

export default function ShiftTypeBadge({ shiftType }: Props) {
  const colors = SHIFT_COLORS[shiftType];
  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>{colors.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
