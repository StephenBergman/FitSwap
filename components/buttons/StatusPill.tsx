// components/StatusPill.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../../lib/theme';

export function StatusPill({ status }: { status: 'accepted' | 'declined' | 'pending' }) {
  const c = useColors();
  const map = {
    accepted: { bg: c.success + '20', fg: c.success },   // 12% alpha
    declined: { bg: c.danger  + '20', fg: c.danger },
    pending:  { bg: c.warning + '20', fg: c.warning },
  }[status];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg, borderColor: map.fg }]}>
      <Text style={[styles.text, { color: map.fg }]}>{status}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  text: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});
