// app/_layout.tsx
import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { DevProvider } from './dev';

export default function RootLayout() {
  const [user, setUser] = useState<any | null>(null);

  // Load the current user once; DevProvider can handle null initially
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <DevProvider user={user}>
      <>
        <Slot />
        <Toast />
      </>
    </DevProvider>
  );
}
