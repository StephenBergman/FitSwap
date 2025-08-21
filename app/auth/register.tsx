// app/register.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Registration Failed', error.message);
    } else {
      Alert.alert('Success', 'Check your email to confirm your account.');
      router.replace('/auth/login');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Create an Account</Text>

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
            multiline={false}
            numberOfLines={1}
            textAlignVertical="center"
          />

          <View style={styles.pwRow}>
            <TextInput
              /* Force remount on toggle so Android redraws correctly */
              key={showPw ? 'pw-text' : 'pw-secure'}
              style={[styles.input, styles.pwInput, Platform.OS === 'android' ? styles.androidPwFont : null]}
              placeholder="Password"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              keyboardType="default"            
              secureTextEntry={!showPw}         
              textContentType="newPassword"
              autoComplete="password-new"
              importantForAutofill="yes"
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              multiline={false}
              numberOfLines={1}
              textAlignVertical="center"
            />
            <TouchableOpacity style={styles.pwToggle} onPress={() => setShowPw((v) => !v)}>
              <Text style={styles.pwToggleText}>{showPw ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/auth/login')} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const INPUT_H = 48;

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    marginBottom: 32,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    height: INPUT_H,
    minHeight: INPUT_H,
    maxHeight: INPUT_H,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    textAlignVertical: 'center',
    includeFontPadding: false,
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 16,
    color: '#111',
  },
  pwRow: { width: '100%', position: 'relative', marginBottom: 16 },
  pwInput: { paddingRight: 54, marginBottom: 0 },
  /* Use system font on Android to avoid rare masking glitches */
  androidPwFont: { fontFamily: 'sans-serif', letterSpacing: 0 },
  pwToggle: {
    position: 'absolute',
    right: 10,
    top: 0,
    height: INPUT_H,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pwToggleText: { color: '#007AFF', fontWeight: '600' },
  button: {
    width: '100%',
    height: INPUT_H,
    backgroundColor: '#34C759',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '500' },
  secondaryButton: { marginTop: 18 },
  secondaryText: { color: '#007AFF', fontSize: 16 },
});
