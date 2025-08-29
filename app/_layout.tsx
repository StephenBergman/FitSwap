// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Image as RNImage, Text as RNText, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfirmProvider } from '../components/confirm/confirmprovider';
import { NotificationsProvider } from '../components/notifications/context';
import { RealtimeProvider } from '../components/realtime/RealtimeProvider';
import { ToastProvider } from '../components/toast/ToastProvider';
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
      <ToastProvider>
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} backgroundColor={c.bg} />

          {/* Single, top-level Stack controls ALL headers/titles. */}
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: c.card },
              headerTintColor: c.text,
              headerTitleStyle: { fontSize: 22, fontWeight: '700' },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              gestureEnabled: true,
              contentStyle: { backgroundColor: c.bg },
              animation: 'default',
            }}
          >
            {/* Drawer/tab layout manages its own header; hide this one */}
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ title: 'Log in', presentation: 'card' }} />
            <Stack.Screen name="auth/register" options={{ title: 'Create account', presentation: 'card' }} />
            <Stack.Screen name="product/[ProductId]" options={{ title: 'Item', presentation: 'card' }} />
            <Stack.Screen name="swaps/[Id]" options={{ title: 'Swap', presentation: 'card' }} />
            <Stack.Screen name="profile/[Id]" options={{ title: 'Edit Profile', presentation: 'card' }} />
            <Stack.Screen
              name="offer/offerscreen"
              options={{
                title: '',
                presentation: 'card',
                headerTitle: ({ children, tintColor }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <RNImage
                      source={require('../assets/images/FitswapLogo.png')}
                      style={{ width: 72, height: 72, marginRight: 8 }}
                      resizeMode="contain"
                    />
                    <RNText style={{ color: tintColor, fontSize: 20, fontWeight: '700' }}>
                      {children}
                    </RNText>
                  </View>
                ),
              }}
            />
          </Stack>
        </View>
      </ToastProvider>
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
        <DevProvider user={user}>
          <NotificationsProvider>
            <RealtimeProvider>
              <Shell />
            </RealtimeProvider>
          </NotificationsProvider>
        </DevProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}
