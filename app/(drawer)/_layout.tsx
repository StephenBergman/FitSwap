// app/(drawer)/_layout.tsx
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import Constants from 'expo-constants';
import { Drawer } from 'expo-router/drawer';
import * as Updates from 'expo-updates';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NotificationsBell from '../../components/notifications/NotificationsBell';
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

export default function DrawerLayout() {
  const c = useColors();

  return (
    <Drawer
      screenOptions={{
        drawerType: 'front',
        headerShown: true,
        headerTitleAlign: 'left',

        // Theme-aware header
        headerStyle: { backgroundColor: c.card },
        headerTitleStyle: { color: c.text },
        headerTintColor: c.text, // hamburger/back chevrons

        // Theme-aware drawer colors 
        drawerStyle: { backgroundColor: c.bg },
        drawerActiveTintColor: c.tint,
        drawerInactiveTintColor: c.muted,
        drawerActiveBackgroundColor: c.card,

        // Bell on the top-right
        headerRight: () => <NotificationsBell />,
      }}
      drawerContent={(p) => <CustomDrawerContent {...p} />}
    >
      <Drawer.Screen name="(tabs)" options={{ title: 'Home' }} />
      <Drawer.Screen name="myitems" options={{ title: 'My Listed Items' }} />
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
