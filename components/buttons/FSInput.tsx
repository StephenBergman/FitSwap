import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useColors } from '../../lib/theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  endAdornment?: React.ReactNode;   // e.g., Show/Hide button
};

export default function FSInput({ label, error, endAdornment, style, ...rest }: Props) {
  const c = useColors();                           // theme colors
  const [focused, setFocused] = useState(false);   // for focus ring
  return (
    <View style={{ width: '100%', marginBottom: 16 }}>
      {label ? <Text style={[styles.label, { color: c.muted }]}>{label}</Text> : null}

      <View
        style={[
          styles.wrap,
          {
            backgroundColor: c.card,
            borderColor: error ? c.danger : focused ? (c.accent ?? c.tint) : c.border,
            shadowColor: c.overlay,
          },
        ]}
      >
        <TextInput
          style={[styles.input, Platform.OS === 'android' ? { fontFamily: 'sans-serif' } : null, style]}
          placeholderTextColor={c.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {endAdornment ? <View style={styles.end}>{endAdornment}</View> : null}
      </View>

      {!!error && <Text style={[styles.error, { color: c.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, marginBottom: 6, fontWeight: '600' },
  wrap: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: 12,
    shadowOpacity: Platform.OS === 'ios' ? 1 : 0,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    height: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    lineHeight: 20,
    color: '#fff', // overridden by theme via parent View/text color
  },
  end: { position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center' },
  error: { marginTop: 6, fontSize: 12, fontWeight: '600' },
});
