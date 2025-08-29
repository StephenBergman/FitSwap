// components/buttons/FSButton.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useColors } from '../../lib/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  style?: ViewStyle;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
};

export default function FSButton({
  title,
  onPress,
  variant = 'primary',
  style,
  disabled,
  size = 'lg',
  block = true,
}: Props) {
  const c = useColors();

  // size tokens
  const H = size === 'lg' ? 56 : size === 'md' ? 52 : 44;
  const FS = size === 'lg' ? 17 : size === 'md' ? 16 : 15;
  const R = size === 'lg' ? 14 : 12;
  const PX = size === 'lg' ? 18 : size === 'md' ? 16 : 14;

  const s = styles(c, variant, disabled, { H, FS, R, PX }, block);
  return (
    <TouchableOpacity
      style={[s.btn, style]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Text style={s.txt}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = (
  c: any,
  v: Variant,
  disabled?: boolean,
  sz?: { H: number; FS: number; R: number; PX: number },
  block?: boolean
) =>
  StyleSheet.create({
    btn: {
      minHeight: sz?.H ?? 56,
      borderRadius: sz?.R ?? 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: sz?.PX ?? 18,
      width: block ? '100%' : undefined,

      // background by variant
      backgroundColor:
        v === 'success'   ? c.success  : 
        v === 'danger'    ? c.danger   :
        v === 'primary'   ? c.tint     :
        'transparent',

      // border by variant
      borderWidth: v === 'secondary' ? 1 : 0,
      borderColor: v === 'secondary' ? (c.accent ?? c.tint) :
                  v === 'ghost'      ? 'transparent' :
                  'transparent',

      opacity: disabled ? 0.6 : 1,
    },
    txt: {
      color:
        v === 'secondary' || v === 'ghost' ? (c.accent ?? c.tint) : '#fff',
      fontSize: sz?.FS ?? 17,
      fontWeight: '700',
    },
  });
