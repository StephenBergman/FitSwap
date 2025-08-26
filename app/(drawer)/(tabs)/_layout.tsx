// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColors } from '../../../lib/theme';

export default function TabLayout() {
  const c = useColors();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,

        // Tab bar styling
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.muted,

        // Tab icons per route
        tabBarIcon: ({ color, size }) => {
          let icon: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'home') icon = 'home';
          if (route.name === 'swap') icon = 'repeat';
          if (route.name === 'settings') icon = 'settings';
          if (route.name === 'myswaps') icon = 'swap-horizontal';
          if (route.name === 'wishlist') icon = 'heart';
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarLabel: 'home' }} />
      <Tabs.Screen name="wishlist" options={{ title: 'Wishlist', tabBarLabel: 'wishlist' }} />
      <Tabs.Screen name="swap" options={{ title: 'Swap', tabBarLabel: 'swap' }} />
      <Tabs.Screen name="myswaps" options={{ title: 'My Swaps', tabBarLabel: 'My Swaps' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarLabel: 'settings' }} />
    </Tabs>
  );
}
