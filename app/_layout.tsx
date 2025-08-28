// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ConfirmProvider } from '../components/confirm/confirmprovider';
import { NotificationsProvider } from '../components/notifications/context';
import { RealtimeProvider } from '../components/realtime/RealtimeProvider';
import { supabase } from '../lib/supabase';
import { ThemeProvider, useColors, useTheme } from '../lib/theme';
import { DevProvider } from './dev';

console.log('EAS Update info:', {
  channel: Updates.channel,
  runtimeVersion: Updates.runtimeVersion,
  updateId: Updates.updateId,
});

function Shell() {
  const { resolvedScheme } = useTheme();
  const c = useColors();

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} backgroundColor={c.bg} />

        {/* Single, top-level Stack controls ALL headers/titles.
           Any nested group layouts (e.g. app/product/_layout.tsx, app/swaps/_layout.tsx)
           should render only <Slot /> (no nested <Stack>) OR set headerShown:false
           so we avoid double headers and lowercase segment titles. */}
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.card },
            headerTintColor: c.text,
            headerTitleStyle: { fontSize: 22, fontWeight: '700' },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal', // iOS: chevron-only back
            gestureEnabled: true,                    // iOS swipe back
            contentStyle: { backgroundColor: c.bg },
            animation: 'default',
          }}
        >
          {/* Nested drawer/tab layout manages its own UI; hide its header here */}
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ title: 'Log in', presentation: 'card' }} />
          <Stack.Screen name="auth/register" options={{ title: 'Create account', presentation: 'card' }} />
          <Stack.Screen name="product/[ProductId]" options={{ title: 'Item', presentation: 'card' }} />
          <Stack.Screen name="swaps/[Id]" options={{ title: 'Swap', presentation: 'card' }} />
          {/* Any other routes inherit the screenOptions above */}
        </Stack>

        <Toast />
      </View>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => mounted && setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <ThemeProvider>
      <ConfirmProvider>
        <NotificationsProvider>
          <DevProvider user={user}>
            {/* Keep realtime subscriptions owned in one place app-wide */}
            <RealtimeProvider>
              <Shell />
            </RealtimeProvider>
          </DevProvider>
        </NotificationsProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}
