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
  View,
} from 'react-native';
import FSButton from '../../components/buttons/FSButton';
import FSInput from '../../components/buttons/FSInput';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const c = useColors();
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

          <FSInput
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />

          <FSInput
            // key swap keeps Android masking correct when toggling
            key={showPw ? 'pw-text' : 'pw-secure'}
            placeholder="Password"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="default"
            secureTextEntry={!showPw}
            textContentType="password"
            autoComplete="password"
            importantForAutofill="yes"
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            endAdornment={
              <Text
                onPress={() => setShowPw(v => !v)}
                style={{ color: c.accent ?? c.tint, fontWeight: '700', paddingHorizontal: 8 }}
              >
                {showPw ? 'Hide' : 'Show'}
              </Text>
            }
          />

          <FSButton title="Log In" onPress={handleLogin} />

          <Text
            onPress={() => router.push('/auth/register')}
            style={styles.link}
          >
            Don’t have an account? Register
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    link: { marginTop: 18, color: c.accent ?? c.tint, fontSize: 16, fontWeight: '600' },
  });
