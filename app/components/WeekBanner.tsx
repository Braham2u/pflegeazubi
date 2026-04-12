import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BRAND } from '../constants/colors';

interface Props {
  workedHours: number;
  contractedHours: number;
}

export default function WeekBanner({ workedHours, contractedHours }: Props) {
  const percent = Math.min((workedHours / contractedHours) * 100, 100);
  const over = workedHours > contractedHours;

  return (
    <View style={styles.container}>
      <View style={styles.textRow}>
        <Text style={styles.label}>Diese Woche</Text>
        <Text style={[styles.hours, over && styles.over]}>
          {workedHours}h / {contractedHours}h
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${percent}%` as any },
            over && styles.fillOver,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BRAND.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: BRAND.textSecondary,
  },
  hours: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.primary,
  },
  over: {
    color: '#DC2626',
  },
  track: {
    height: 6,
    backgroundColor: BRAND.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: BRAND.primary,
    borderRadius: 3,
  },
  fillOver: {
    backgroundColor: '#DC2626',
  },
});
