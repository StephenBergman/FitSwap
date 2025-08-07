// app/(tabs)/settings.tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Appearance,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const systemScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState(systemScheme === 'dark');
  const router = useRouter();

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setDarkMode(colorScheme === 'dark');
    });

    return () => subscription.remove();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      return;
    }
    router.replace('/auth/login'); 
  };

  const toggleDarkMode = () => {
    // Placeholder 
    const newMode = !darkMode;
    setDarkMode(newMode);
    
  };

  return (
    <View style={[styles.container, darkMode && styles.dark]}>
      <Text style={[styles.heading, darkMode && styles.darkText]}>Settings</Text>

      <View style={styles.row}>
        <Text style={[styles.label, darkMode && styles.darkText]}>Dark Mode</Text>
        <Switch value={darkMode} onValueChange={toggleDarkMode} />
      </View>

      <TouchableOpacity style={styles.grayButton}>
        <Text style={styles.grayText}>Change Password</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.redButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: '#fff',
  },
  dark: {
    backgroundColor: '#1c1c1e',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  darkText: {
    color: '#fff',
  },
  label: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  grayButton: {
    backgroundColor: '#eee',
    padding: 14,
    borderRadius: 6,
    marginBottom: 20,
  },
  grayText: {
    textAlign: 'center',
    color: '#333',
  },
  redButton: {
    backgroundColor: '#FF3B30',
    padding: 14,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
