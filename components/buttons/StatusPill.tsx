// components/StatusPill.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { tokens, useColors, useTheme } from '../../lib/theme';

export type PillStatus = 'accepted' | 'declined' | 'pending' | 'canceled';

const alpha = (hex: string, a: number) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(
    hex.slice(5, 7),
    16
  )},${a})`;

type Props = {
  status: PillStatus;
  /** Optional text override. Defaults to the status string. */
  label?: string;
  /** Optional style override for the pill container. */
  style?: StyleProp<ViewStyle>;
};

export function StatusPill({ status, label, style }: Props) {
  const c = useColors();
  const { resolvedScheme } = useTheme();
  const dark = resolvedScheme === 'dark';

  const palette = {
    accepted: {
      fg: tokens.successBase,                            // fixed hue across schemes
      bg: alpha(tokens.successBase, dark ? 0.22 : 0.14), // scheme-aware tint
      border: tokens.successBase,
    },
    declined: {
      fg: c.danger,
      bg: alpha(c.danger, dark ? 0.22 : 0.14),
      border: c.danger,
    },
    pending: {
      fg: c.warning,
      bg: alpha(c.warning, dark ? 0.22 : 0.12),
      border: c.warning,
    },
    canceled: {
      fg: c.muted,
      bg: alpha(c.muted, dark ? 0.20 : 0.12),
      border: c.muted,
    },
  } as const;

  const s = palette[status];

  return (
    <View style={[styles.pill, { backgroundColor: s.bg, borderColor: s.border }, style]}>
      <Text style={[styles.text, { color: s.fg }]}>{label ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start', // makes the pill wrap its text (no stretching)
  },
  text: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});

export default StatusPill;
