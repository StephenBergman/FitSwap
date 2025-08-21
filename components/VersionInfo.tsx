// components/VersionInfo.tsx
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

/**
 * Shows app version + build, current updates channel, and short updateId.
 * Works in dev, internal, and production. Safe on web.
 */
export default function VersionInfo() {
  const appVersion =
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    'dev';

  // Build number (iOS CFBundleVersion / Android versionCode)
  const buildNumber =
    Application.nativeBuildVersion ||
    (Platform.OS === 'android'
      ? String(Constants.expoConfig?.android?.versionCode ?? '')
      : String(Constants.expoConfig?.ios?.buildNumber ?? ''));

  // EAS Updates info (falls back nicely outside updates)
  const channel =
    (Updates as any)?.channel ||
    (Updates?.isEmbeddedLaunch ? 'embedded' : Platform.OS === 'web' ? 'web' : 'dev');

  const updateIdShort = Updates?.updateId ? Updates.updateId.slice(0, 8) : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.txt}>
        v{appVersion}
        {buildNumber ? ` (${buildNumber})` : ''} • {channel}
        {updateIdShort ? ` • ${updateIdShort}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 'auto', // pins to bottom inside drawer scroll view
  },
  txt: {
    fontSize: 12,
    color: '#64748b',
  },
});
