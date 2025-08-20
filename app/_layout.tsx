import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';

// ✅ use correct casing for the file name
import { ConfirmProvider } from '../components/confirm/confirmprovider';

import { supabase } from '../lib/supabase';
import { ThemeProvider, useColors, useTheme } from '../lib/theme';
import { DevProvider } from './dev';

function Shell() {
  const { resolvedScheme } = useTheme();
  const c = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} backgroundColor={c.bg} />
      <Slot />
      <Toast />
    </View>
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
          <Shell />
        </DevProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}
