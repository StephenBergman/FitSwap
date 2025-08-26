// app/_layout.tsx
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';
import { ConfirmProvider } from '../components/confirm/confirmprovider';
import { NotificationsProvider } from '../components/notifications/context';
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
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar
        style={resolvedScheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={c.bg}
      />
      <Slot />
      <Toast />
    </View>
  );
}

export default function RootLayout() {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user ?? null);
    });
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
            <Shell />
          </DevProvider>
        </NotificationsProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}
