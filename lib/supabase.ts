// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import authStorage from '../lib/authStorage'; // platform-specific adapter

const supabaseUrl = 'https://dsivhrumkuileojbkffm.supabase.co';
export const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXZocnVta3VpbGVvamJrZmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTgxNDUsImV4cCI6MjA2NjI5NDE0NX0.TYkUH-VsG59vHxsGwudmRfWwaSf6QuvCBZfR0sLLV14';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Web needs this for OAuth redirect parsing; native should keep it off
    detectSessionInUrl: Platform.OS === 'web',
    storage: authStorage,
  },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
});

// Keep the realtime socket authenticated with the current JWT (important on native)
supabase.auth.getSession().then(({ data }) => {
  const token = data.session?.access_token ?? '';
  if (token) supabase.realtime.setAuth(token);
});

supabase.auth.onAuthStateChange((_event, session) => {
  supabase.realtime.setAuth(session?.access_token ?? '');
});

export default supabase;
