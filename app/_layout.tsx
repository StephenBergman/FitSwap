// app/_layout.tsx
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';
import { ConfirmProvider } from '../components/confirm/confirmprovider';
import { supabase } from '../lib/supabase';
import { ThemeProvider, useColors, useTheme } from '../lib/theme';
import { DevProvider } from './dev';

function Shell() {
  const { resolvedScheme } = useTheme();
  const c = useColors();

  return (
    // Give the root a themed background to avoid flashes on route changes
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar
        style={resolvedScheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={c.bg}
      />
      {/* Let nested layouts (tabs, product, swaps) control their own headers */}
      <Slot />
      <Toast />
    </View>
  );
}

export default function RootLayout() {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    // initial user load
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user ?? null);
    });

    // keep user in sync while app is open
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <ThemeProvider>
      {/* Wrap the whole app so useConfirm() works anywhere */}
      <ConfirmProvider>
        <DevProvider user={user}>
          <Shell />
        </DevProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}
