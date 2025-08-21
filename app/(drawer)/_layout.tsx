// app/(drawer)/_layout.tsx
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import Constants from 'expo-constants';
import { Drawer } from 'expo-router/drawer';
import * as Updates from 'expo-updates';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Minimal footer that shows version, channel, and short update id.
// Uses only expo-constants and expo-updates to avoid extra deps.
function VersionFooter() {
  const version = Constants.expoConfig?.version ?? 'dev';
  const channel =
    // channel is defined when using EAS Updates with channels
    (Updates as any)?.channel ||
    (Updates?.isEmbeddedLaunch ? 'embedded' : 'dev');
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
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <DrawerItemList {...props} />
      {/* Push the footer to the bottom */}
      <View style={{ flex: 1 }} />
      <VersionFooter />
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{ headerShown: false, drawerType: 'front' }}
      drawerContent={(p) => <CustomDrawerContent {...p} />}
    >
      {/* Tabs bundle */}
      <Drawer.Screen name="(tabs)" options={{ title: 'Home', headerShown: false }} />
      {/* Extra destination(s) in the hamburger */}
      <Drawer.Screen name="myitems" options={{ title: 'My Listed Items', headerShown: true }} />
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
