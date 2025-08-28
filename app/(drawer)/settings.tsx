// app/(tabs)/settings.tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import FSButton from '../../components/buttons/FSButton';
import DevPanel from '../../components/dev/devpanel';
import { pageWrap, WEB_MAX_WIDTH } from '../../lib/layout';
import { registerDeviceTokenIfAllowed, setPushPref } from '../../lib/notifications/push';
import { supabase } from '../../lib/supabase';
import { radius, spacing, type as tt, useColors, useTheme } from '../../lib/theme';

export default function SettingsScreen() {
  const { scheme, setScheme } = useTheme();
  const c = useColors();
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
    <View style={[styles.outer, { backgroundColor: c.bg }]}>
      {/* Max-width wrapper to center content on web */}
      <View style={pageWrap(WEB_MAX_WIDTH)}>
        <View style={[styles.container]}>
          <Text style={[styles.heading, { color: c.text }]}>Settings</Text>

          {/* Theme mode quick-select */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.pill,
                { backgroundColor: scheme === 'system' ? c.tint : c.card, borderColor: c.border },
              ]}
              onPress={() => setScheme('system')}
            >
              <Text style={[styles.pillText, { color: scheme === 'system' ? '#fff' : c.text }]}>
                Use System {scheme === 'system' ? '✓' : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pill,
                { backgroundColor: scheme === 'light' ? c.tint : c.card, borderColor: c.border },
              ]}
              onPress={() => setScheme('light')}
            >
              <Text style={[styles.pillText, { color: scheme === 'light' ? '#fff' : c.text }]}>
                Light {scheme === 'light' ? '✓' : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pill,
                { backgroundColor: scheme === 'dark' ? c.tint : c.card, borderColor: c.border },
              ]}
              onPress={() => setScheme('dark')}
            >
              <Text style={[styles.pillText, { color: scheme === 'dark' ? '#fff' : c.text }]}>
                Dark {scheme === 'dark' ? '✓' : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notifications section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Notifications</Text>

            <View style={[styles.rowBetween, { borderColor: c.border }]}>
              <Text style={[styles.label, { color: c.text }]}>Push notifications</Text>
              <Switch value={pushEnabled} disabled={loadingPush} onValueChange={handleTogglePush} />
            </View>

            <Text style={[styles.hint, { color: c.muted }]}>
              Receive alerts for trade offers and status updates. You can also review past alerts from
              the bell icon in the top bar.
            </Text>
          </View>

          {/* Account actions */}
          <FSButton
            title="Change Password"
            variant="secondary"
            onPress={() => Alert.alert('Not implemented', 'Password change flow coming soon.')}
            style={{ marginBottom: spacing.md }}
          />

          <FSButton
            title="Log Out"
            variant="danger"
            onPress={handleLogout}
            style={{ marginBottom: spacing.lg }}
          />

          <DevPanel style={{ marginBottom: spacing.md }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: { padding: spacing.lg },
  heading: {
    fontSize: tt.title.size,
    lineHeight: tt.title.lineHeight,
    fontWeight: tt.title.weight,
    marginBottom: spacing.lg,
  },

  label: { fontSize: tt.body.size },

  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, // subtle divider under the row
  },

  pill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillText: { fontWeight: '600' },

  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  hint: { fontSize: 12, marginTop: spacing.xs },
});
