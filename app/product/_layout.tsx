// app/product/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColors, useTheme } from '../../lib/theme';

export default function ProductLayout() {
  const c = useColors();
  const { resolvedScheme } = useTheme();
  const barStyle = resolvedScheme === 'dark' ? 'light' : 'dark';

  return (
    <>
      <StatusBar style={barStyle} backgroundColor={c.bg} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTitleStyle: { color: c.text },
          headerTintColor: c.text,          // back arrow / icons
          headerShadowVisible: false,       // no divider line
          contentStyle: { backgroundColor: c.bg },
        }}
      />
    </>
  );
}
