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

        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.muted,

        tabBarIcon: ({ color, size }) => {
          let icon: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'home') icon = 'home';
          if (route.name === 'wishlist') icon = 'heart';
          if (route.name === 'swap') icon = 'repeat';
          if (route.name === 'myswaps') icon = 'swap-horizontal';
          if (route.name === 'profile') icon = 'person-circle'; 
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="wishlist" options={{ title: 'Wishlist', tabBarLabel: 'Wishlist' }} />
      <Tabs.Screen name="swap" options={{ title: 'Swap', tabBarLabel: 'Swap' }} />
      <Tabs.Screen name="myswaps" options={{ title: 'My Swaps', tabBarLabel: 'My Swaps' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} /> 
      
    </Tabs>
  );
}
