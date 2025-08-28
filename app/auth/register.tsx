// app/register.tsx
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

export default function RegisterScreen() {
  const router = useRouter();
  const c = useColors();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const styles = useMemo(() => makeStyles(c), [c]);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert('Registration Failed', error.message);
        return;
      }
      Alert.alert('Success', 'Check your email to confirm your account.');
      router.replace('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[pageContent(WEB_NARROW), styles.scroll]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Centered, constrained panel on web; normal padded screen on native */}
        <View style={[pageWrap(WEB_NARROW), styles.panel, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>Create an Account</Text>

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
            key={showPw ? 'pw-text' : 'pw-secure'} // Android redraw on toggle
            placeholder="Password"
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
            endAdornment={
              <Text
                onPress={() => setShowPw(v => !v)}
                style={{ color: c.accent ?? c.tint, fontWeight: '700', paddingHorizontal: 8 }}
              >
                {showPw ? 'Hide' : 'Show'}
              </Text>
            }
          />

          <FSButton title={loading ? 'Creating…' : 'Register'} onPress={handleRegister} disabled={loading} />

          <Text
            onPress={() => router.replace('/auth/login')}
            style={[styles.link, { color: c.accent ?? c.tint }]}
          >
            Already have an account? Log in
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 1,
      justifyContent: 'center', // vertical centering when content is short
      paddingVertical: 24,
    },
    // Card-like surface that looks good on web and native
    panel: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 16,
      padding: 20,
      // soft shadow on iOS / elevation on Android
      shadowColor: c.overlay ?? '#000',
      shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      ...(Platform.OS === 'android' ? { elevation: 2 } : null),
    },
    title: {
      fontSize: 28,
      marginBottom: 24,
      fontWeight: '700',
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    link: {
      marginTop: 16,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
