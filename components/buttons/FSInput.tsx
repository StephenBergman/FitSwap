// components/buttons/FSInput.tsx
import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useColors } from '../../lib/theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  endAdornment?: React.ReactNode;   // e.g., Show/Hide button
  containerStyle?: ViewStyle;       // optional outer wrapper override
  inputStyle?: TextStyle;           // optional inner TextInput override
};

export default function FSInput({
  label,
  error,
  endAdornment,
  containerStyle,
  inputStyle,
  style, // keep supporting callers that pass style for the input
  placeholderTextColor,
  ...rest
}: Props) {
  const c = useColors();                           // theme colors
  const [focused, setFocused] = useState(false);   // for focus ring

  const borderColor = error
    ? c.danger
    : focused
    ? (c.accent ?? c.tint)
    : c.border;

  return (
    <View style={[{ width: '100%', marginBottom: 16 }, containerStyle]}>
      {/* Optional label */}
      {label ? <Text style={[styles.label, { color: c.muted }]}>{label}</Text> : null}

      {/* Field wrapper (background, border, subtle elevation on iOS) */}
      <View
        style={[
          styles.wrap,
          {
            backgroundColor: c.card,
            borderColor,
            shadowColor: c.overlay ?? '#000',
          },
        ]}
      >
        <TextInput
          {...rest}
          // TextInput does not inherit text color; set from theme
          style={[
            styles.input,
            Platform.OS === 'android' ? { fontFamily: 'sans-serif' } : null,
            { color: c.text },               // primary text color from theme
            inputStyle,                      // explicit inputStyle prop
            style,                           // fallback for callers using "style"
          ]}
          placeholderTextColor={placeholderTextColor ?? c.muted}
          selectionColor={c.tint}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
        />

        {/* Optional end adornment (e.g., Show/Hide) */}
        {endAdornment ? <View style={styles.end}>{endAdornment}</View> : null}
      </View>

      {/* Inline error helper text */}
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
    // iOS-only soft elevation for focus; Android uses border/tint
    shadowOpacity: Platform.OS === 'ios' ? 1 : 0,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    height: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    lineHeight: 20,
    // text color is set dynamically from theme in render
  },
  end: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  error: { marginTop: 6, fontSize: 12, fontWeight: '600' },
});
