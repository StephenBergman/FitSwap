// components/layout/Page.tsx
import React from 'react';
import { View, ViewProps } from 'react-native';
import { pageWrap, WEB_MAX_WIDTH } from '../../lib/layout';

export default function Page({
  maxWidth = WEB_MAX_WIDTH,
  padded = true,
  style,
  children,
  ...rest
}: ViewProps & { maxWidth?: number; padded?: boolean }) {
  return (
    <View style={[pageWrap(maxWidth, padded), style]} {...rest}>
      {children}
    </View>
  );
}
