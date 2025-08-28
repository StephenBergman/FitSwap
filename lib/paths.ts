// Centralize typed routes so navigation is consistent everywhere.
import type { Href } from 'expo-router';

export const ROUTES = {
  home: '/home' as const satisfies Href,
  myItems: '/myitems' as const satisfies Href,
  profile: '/(drawer)/(tabs)/profile' as const satisfies Href,
};
