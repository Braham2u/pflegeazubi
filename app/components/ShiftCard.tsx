import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shift } from '../types';
import { SHIFT_COLORS, BRAND } from '../constants/colors';
import ShiftTypeBadge from './ShiftTypeBadge';

interface Props {
  shift: Shift;
  onPress?: (shift: Shift) => void;
}

export default function ShiftCard({ shift, onPress }: Props) {
  const colors = SHIFT_COLORS[shift.shiftType];
  const isFree = shift.shiftType === 'free';

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: colors.text }]}
      onPress={() => onPress?.(shift)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <ShiftTypeBadge shiftType={shift.shiftType} />
        {!isFree && (
          <Text style={styles.time}>
            {shift.startTime} – {shift.endTime}
          </Text>
        )}
      </View>
      {!isFree && (
        <Text style={styles.facility}>
          {shift.facilityName}
          {shift.unitName ? ` · ${shift.unitName}` : ''}
        </Text>
      )}
      {shift.notes ? <Text style={styles.notes}>{shift.notes}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.textPrimary,
  },
  facility: {
    marginTop: 4,
    fontSize: 13,
    color: BRAND.textSecondary,
  },
  notes: {
    marginTop: 4,
    fontSize: 12,
    color: BRAND.textSecondary,
    fontStyle: 'italic',
  },
});
