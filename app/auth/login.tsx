// app/login.tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in both fields');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      router.replace('/home');
    }
  };

  const goToRegister = () => router.push('/auth/register');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login to FitSwap</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        returnKeyType="next"
      />

      {/* Password row so we can add a show/hide toggle */}
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry={!show}
          // Important on Android: avoid custom font/spacing when secure
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          textContentType="password"
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        <TouchableOpacity style={styles.toggle} onPress={() => setShow((s) => !s)}>
          <Text style={styles.toggleText}>{show ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={goToRegister}>
        <Text style={styles.secondaryText}>Don’t have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 24,
    marginBottom: 32,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    flex: 1,
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  // Make sure password uses system font and no spacing tweaks on Android
  passwordInput: Platform.select({
    android: {
      fontFamily: 'sans-serif', // force system font with bullet glyph
      letterSpacing: 0,
    },
    default: {},
  }),
  passwordRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggle: {
    paddingHorizontal: 8,
    height: 48,
    justifyContent: 'center',
  },
  toggleText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  secondaryButton: { marginTop: 20 },
  secondaryText: { color: '#007AFF', fontSize: 16 },
});
