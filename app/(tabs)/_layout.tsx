// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let icon: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'home') icon = 'home';
          else if (route.name === 'wishlist') icon = 'heart';
          else if (route.name === 'swap') icon = 'repeat';
          else if (route.name === 'myswaps') icon = 'swap-horizontal';
          else if (route.name === 'settings') icon = 'settings';

          return <Ionicons name={icon} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="wishlist" options={{ title: 'Wishlist' }} />
      <Tabs.Screen name="swap" options={{ title: 'Swap' }} />
      <Tabs.Screen name="myswaps" options={{ title: 'My Swaps' }} />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
