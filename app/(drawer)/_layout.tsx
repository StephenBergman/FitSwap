// app/(drawer)/_layout.tsx
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as Updates from 'expo-updates';
import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Image, StyleSheet, Text, View } from 'react-native';
import { useNotifications } from '../../components/notifications/context';
import NotificationsBell from '../../components/notifications/NotificationsBell';
import ProfileButton from '../../components/profile/ProfileButton';
import { on } from '../../lib/eventBus';
import { useColors } from '../../lib/theme';

function VersionFooter() {
  const version = Constants.expoConfig?.version ?? 'dev';
  const channel =
    (Updates as any)?.channel || (Updates?.isEmbeddedLaunch ? 'embedded' : 'dev');
  const shortId = Updates?.updateId ? Updates.updateId.slice(0, 8) : null;

  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        v{version} • {channel}
        {shortId ? ` • ${shortId}` : ''}
      </Text>
    </View>
  );
}

function CustomDrawerContent(props: any) {
  const c = useColors();
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flex: 1, backgroundColor: c.bg }}
    >
      <DrawerItemList {...props} />
      <View style={{ flex: 1 }} />
      <VersionFooter />
    </DrawerContentScrollView>
  );
}

// Small header component: logo + brand text
function HeaderLogo() {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Image
        source={require('../../assets/images/FitswapLogo.png')}
        style={{ width: 72, height: 72 }}
        resizeMode="contain"
        accessible
        accessibilityLabel="FitSwap"
      />
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 20 }}>
        {/* Place Text Here (Header title for all pages if I want it later. For now just logo. */}{' '}
      </Text>
    </View>
  );
}

export default function DrawerLayout() {
  const c = useColors();
  const router = useRouter();

  // Just call refresh; badge and panel read from context
  const { refresh } = useNotifications();

  // 1) Update when RealtimeProvider emits the event-bus signal
  useEffect(() => {
    const off = on('notifications:changed', () => {
      refresh();
      // tiny follow-up re-check to dodge replica lag
      setTimeout(refresh, 900);
    });
    return off;
  }, [refresh]);

  // 2) Refresh whenever this navigator regains focus,
  //    and do a light poll while focused (15s)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      refresh();
      const id = setInterval(() => !cancelled && refresh(), 15000);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [refresh])
  );

  // 3) Also refresh when app returns to foreground
  const appState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        refresh();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [refresh]);

  return (
    <Drawer
      screenOptions={{
        drawerType: 'front',
        headerShown: true,

        headerTitle: () => <HeaderLogo />, // custom title for all drawer screens
        headerTitleAlign: 'left',

        // Theme-aware header
        headerStyle: { backgroundColor: c.card },
        headerTitleStyle: { color: c.text },
        headerTintColor: c.text,

        // Theme-aware drawer colors
        drawerStyle: { backgroundColor: c.bg },
        drawerActiveTintColor: c.tint,
        drawerInactiveTintColor: c.muted,
        drawerActiveBackgroundColor: c.card,

        // Bell + profile avatar on the top-right
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <NotificationsBell />
            <ProfileButton />
          </View>
        ),
      }}
      drawerContent={(p) => <CustomDrawerContent {...p} />}
    >
      {/* Ensure selecting "Home" goes to the /home tab */}
      <Drawer.Screen
        name="(tabs)"
        options={{ title: 'Home' }} // title is used for the drawer item label only
        listeners={({ navigation }) => ({
          drawerItemPress: (e) => {
            e.preventDefault();
            router.navigate('/home');
            navigation.closeDrawer();
          },
        })}
      />

      <Drawer.Screen
        name="myitems"
        options={{ title: 'My Listed Items' }}
        listeners={({ navigation }) => ({
          drawerItemPress: (e) => {
            e.preventDefault();
            router.navigate('/myitems');
            navigation.closeDrawer();
          },
        })}
      />

      <Drawer.Screen
        name="settings"
        options={{ title: 'Settings' }}
        listeners={({ navigation }) => ({
          drawerItemPress: (e) => {
            e.preventDefault();
            router.navigate('/settings');
            navigation.closeDrawer();
          },
        })}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
  },
});
