// app/login.tsx
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const c = useColors(); // themed colors
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const styles = useMemo(() => makeStyles(c), [c]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in both fields');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Failed', error.message);
    else router.replace('/home');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Log in to FitSwap</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={c.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />

          <View style={styles.pwRow}>
            <TextInput
              key={showPw ? 'pw-text' : 'pw-secure'} // force remount for Android
              style={[styles.input, styles.pwInput, Platform.OS === 'android' ? styles.androidPwFont : null]}
              placeholder="Password"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              keyboardType="default" // keep masking correct on Android
              secureTextEntry={!showPw}
              textContentType="password"
              autoComplete="password"
              importantForAutofill="yes"
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPw(v => !v)} style={styles.pwToggle}>
              <Text style={styles.pwToggleText}>{showPw ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.9}>
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Don’t have an account? Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const INPUT_H = 52;

const makeStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    scroll: { flexGrow: 1 },
    container: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingBottom: 24,
    },
    title: {
      fontSize: 28,
      marginBottom: 28,
      fontWeight: '700',
      color: c.text,
      letterSpacing: 0.2,
    },
    input: {
      height: INPUT_H,
      width: '100%',
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 12,
      backgroundColor: c.card,
      paddingHorizontal: 14,
      fontSize: 16,
      lineHeight: 20,
      color: c.text,
      marginBottom: 16,
      shadowColor: 'rgba(0,0,0,0.06)',
      shadowOpacity: Platform.OS === 'ios' ? 1 : 0,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    pwRow: {
      width: '100%',
      position: 'relative',
      marginBottom: 16,
    },
    pwInput: { paddingRight: 58, marginBottom: 0 },
    androidPwFont: { fontFamily: 'sans-serif', letterSpacing: 0 },
    pwToggle: {
      position: 'absolute',
      right: 10,
      top: 0,
      height: INPUT_H,
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    pwToggleText: { color: c.accent ?? c.tint, fontWeight: '700' },
    button: {
      width: '100%',
      height: INPUT_H,
      backgroundColor: c.tint, // primary
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
    },
    buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    secondaryButton: { marginTop: 18 },
    secondaryText: { color: c.accent ?? c.tint, fontSize: 16, fontWeight: '600' },
  });
