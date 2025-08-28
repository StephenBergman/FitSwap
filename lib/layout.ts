// lib/layout.ts
import { Platform, ViewStyle } from 'react-native';
import { spacing } from './theme';

export const isWeb = Platform.OS === 'web';

// Pick one place to own these numbers
export const WEB_MAX_WIDTH = 1200; // wide pages (home/feed)
export const WEB_NARROW   = 920;   // detail pages (product/swap)

// View wrapper for non-list content (centers on web, normal on native)
export function pageWrap(max = WEB_MAX_WIDTH, padded = true): ViewStyle {
  if (!isWeb) return { paddingHorizontal: padded ? spacing.lg : 0 };
  return {
    width: '100%',
    maxWidth: max,
    alignSelf: 'center',
    paddingHorizontal: padded ? spacing.lg : 0,
  };
}

// For ScrollView/FlatList contentContainerStyle
export function pageContent(max = WEB_MAX_WIDTH, padded = true): ViewStyle {
  if (!isWeb) return { paddingHorizontal: padded ? 0 : 0 };
  return {
    width: '100%',
    maxWidth: max,
    alignSelf: 'center',
    paddingHorizontal: padded ? spacing.lg : 0,
  };
}
