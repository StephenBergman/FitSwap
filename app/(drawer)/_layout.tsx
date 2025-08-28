// app/(drawer)/_layout.tsx
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as Updates from 'expo-updates';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import NotificationsBell from '../../components/notifications/NotificationsBell';
import ProfileButton from '../../components/profile/ProfileButton';
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
        // path: client/assets/images/FitswapLogo.png
        source={require('../../assets/images/FitswapLogo.png')}
        style={{ width: 28, height: 28 }}
        resizeMode="contain"
        accessible
        accessibilityLabel="FitSwap"
      />
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 20 }}>FitSwap</Text>
    </View>
  );
}

export default function DrawerLayout() {
  const c = useColors();
  const router = useRouter();

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
