// app/(tabs)/settings.tsx
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DevPanel from '../../../components/dev/devpanel';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../lib/theme';

export default function SettingsScreen() {
   const { scheme, resolvedScheme, setScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const router = useRouter();

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

      {/* Optional quick buttons to set exact mode */}
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },

  pill: {
    backgroundColor: '#eee',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
  },
  pillText: { color: '#333', fontWeight: '600' },

  grayButton: { backgroundColor: '#eee', padding: 14, borderRadius: 6, marginBottom: 20 },
  grayText: { textAlign: 'center', color: '#333' },
  redButton: { backgroundColor: '#FF3B30', padding: 14, borderRadius: 6 },
  logoutText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
});
