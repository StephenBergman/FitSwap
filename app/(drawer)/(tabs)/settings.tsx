// app/(tabs)/settings.tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import DevPanel from '../../../components/dev/devpanel';
import { registerDeviceTokenIfAllowed, setPushPref } from '../../../lib/notifications';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../lib/theme';

export default function SettingsScreen() {
  const { scheme, resolvedScheme, setScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const router = useRouter();

  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [loadingPush, setLoadingPush] = useState<boolean>(false);

  useEffect(() => {
    // load current push preference for this user from profiles table
    (async () => {
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('push_enabled')
        .eq('id', uid)
        .single();

      if (!error && data?.push_enabled != null) {
        setPushEnabled(!!data.push_enabled);
      }
    })();
  }, []);

  const handleTogglePush = async (value: boolean) => {
    setLoadingPush(true);
    setPushEnabled(value);
    try {
      await setPushPref(value);
      if (value) {
        const token = await registerDeviceTokenIfAllowed();
        if (!token) {
          Alert.alert(
            'Notifications disabled',
            'Enable system notifications for this app in device settings to receive alerts.'
          );
        }
      }
    } catch (e) {
      console.error('Push toggle error:', e);
      Alert.alert('Error', 'Could not update notification settings.');
      setPushEnabled(prev => !prev);
    } finally {
      setLoadingPush(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      return;
    }
    router.replace('/auth/login');
  };

  return (
    <View style={[styles.container, isDark && styles.dark]}>
      <Text style={[styles.heading, isDark && styles.darkText]}>Settings</Text>

      {/* Theme mode quick-select */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.pill} onPress={() => setScheme('system')}>
          <Text style={styles.pillText}>Use System {scheme === 'system' ? '✓' : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pill} onPress={() => setScheme('light')}>
          <Text style={styles.pillText}>Light {scheme === 'light' ? '✓' : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pill} onPress={() => setScheme('dark')}>
          <Text style={styles.pillText}>Dark {scheme === 'dark' ? '✓' : ''}</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Notifications</Text>

        <View style={styles.rowBetween}>
          <Text style={[styles.label, isDark && styles.darkText]}>Push notifications</Text>
          <Switch
            value={pushEnabled}
            disabled={loadingPush}
            onValueChange={handleTogglePush}
          />
        </View>
        <Text style={[styles.hint, isDark && styles.hintDark]}>
          Receive alerts for trade offers and status updates. You can also review past alerts from the bell icon in the top bar.
        </Text>
      </View>

      <TouchableOpacity style={styles.grayButton}>
        <Text style={styles.grayText}>Change Password</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.redButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <DevPanel style={{ marginBottom: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: '#fff' },
  dark: { backgroundColor: '#1c1c1e' },

  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  darkText: { color: '#fff' },

  label: { fontSize: 16 },

  row: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },

  pill: {
    backgroundColor: '#eee',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
  },
  pillText: { color: '#333', fontWeight: '600' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 12, color: '#555', marginTop: 4 },
  hintDark: { color: '#aaa' },

  grayButton: { backgroundColor: '#eee', padding: 14, borderRadius: 6, marginBottom: 20 },
  grayText: { textAlign: 'center', color: '#333' },
  redButton: { backgroundColor: '#FF3B30', padding: 14, borderRadius: 6 },
  logoutText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
});
