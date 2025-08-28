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
import { pageContent, pageWrap, WEB_NARROW } from '../../lib/layout';
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
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          pageContent(WEB_NARROW, true), // center + gutters on web
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Centered card (web gets max width, native just gets padding) */}
        <View style={[pageWrap(WEB_NARROW, true), styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>Log in to FitSwap</Text>

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

          <Text onPress={() => router.push('/auth/register')} style={[styles.link, { color: c.accent ?? c.tint }]}>
            Don’t have an account? Register
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    // Vertical centering for tall screens; still scrolls on small ones
    scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 32 },
    // Card wrapper matches app theme and keeps form at a comfortable reading width
    card: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 14,
      padding: 20,
      gap: 14,
      // light shadow on native; browser handles nicely with border only
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
    },
    title: {
      fontSize: 28,
      marginBottom: 8,
      fontWeight: '800',
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    link: {
      marginTop: 8,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
