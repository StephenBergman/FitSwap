import React from 'react';
import { StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { useDev } from '../../app/dev';

type Props = {
  style?: ViewStyle;
};

export default function DevPanel({ style }: Props) {
  const { visible, enabled, setEnabled, flags, setFlag } = useDev();

  if (!visible) return null;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Developer Options</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Developer Mode</Text>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>

      {enabled && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Include self-swaps</Text>
            <Switch
              value={flags.includeSelfSwaps}
              onValueChange={(v) => setFlag('includeSelfSwaps', v)}
            />
          </View>

          {/* Add future dev toggles here */}
          {/* <View style={styles.row}>
              <Text style={styles.label}>Show debug overlays</Text>
              <Switch value={flags.debugOverlays} onValueChange={(v) => setFlag('debugOverlays', v)} />
            </View> */}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: '#ffffff',
  },
  title: {
    fontWeight: '700',
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'space-between',
  },
  label: {
    color: '#334155',
    fontWeight: '600',
  },
});
