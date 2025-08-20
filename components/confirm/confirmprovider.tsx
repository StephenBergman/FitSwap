import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '../../lib/theme';

export type ConfirmOptions = {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>;
type ConfirmContextValue = { confirm: ConfirmFn };
const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const DEFAULTS: Required<ConfirmOptions> = {
  title: 'Are you sure?',
  message: '',
  confirmText: 'OK',
  cancelText: 'Cancel',
  destructive: false,
};

export function ConfirmProvider({ children }: PropsWithChildren) {
  const c = useColors();
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>(DEFAULTS);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm: ConfirmFn = (options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpts({ ...DEFAULTS, ...(options ?? {}) });
      setVisible(true);
    });
  };

  const resolveAndClose = (value: boolean) => {
    setVisible(false);
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.(value);
  };

  // Esc to close on web
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolveAndClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Dialog */}
      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={() => resolveAndClose(false)} // Android back
      >
        <View style={[styles.backdrop]} />

        <View
          style={styles.centerWrap}
          accessibilityRole="alert"
          accessible
        >
          <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
            {!!opts.title && (
              <Text style={[styles.title, { color: c.text }]}>{opts.title}</Text>
            )}
            {!!opts.message && (
              <Text style={[styles.message, { color: c.muted }]}>{opts.message}</Text>
            )}

            <View style={styles.row}>
              <Pressable
                onPress={() => resolveAndClose(false)}
                style={({ pressed }) => [
                  styles.btn,
                  { backgroundColor: pressed ? c.border : 'transparent' },
                ]}
                android_ripple={{ color: c.border }}
              >
                <Text style={[styles.btnText, { color: c.text }]}>{opts.cancelText}</Text>
              </Pressable>

              <Pressable
                onPress={() => resolveAndClose(true)}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor: pressed ? (opts.destructive ? '#ffebeb' : c.border) : 'transparent',
                    borderColor: opts.destructive ? '#FF3B30' : c.tint,
                    borderWidth: 1,
                  },
                ]}
                android_ripple={{ color: opts.destructive ? '#ffe2e2' : c.border }}
              >
                <Text
                  style={[
                    styles.btnText,
                    { color: opts.destructive ? '#FF3B30' : c.tint, fontWeight: '600' },
                  ]}
                >
                  {opts.confirmText}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (ctx) return ctx.confirm;

  // Fallback if provider isn’t mounted yet.
  return async (o?: ConfirmOptions) => {
    const options = { ...DEFAULTS, ...(o ?? {}) };
    if (Platform.OS === 'web') {
      const text = options.title
        ? `${options.title}\n\n${options.message ?? ''}`
        : options.message ?? '';
      return window.confirm(text);
    }
    // Native fallback: Alert with two buttons
    const { Alert } = await import('react-native');
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        options.title || DEFAULTS.title,
        options.message || '',
        [
          { text: options.cancelText || DEFAULTS.cancelText, style: 'cancel', onPress: () => resolve(false) },
          {
            text: options.confirmText || DEFAULTS.confirmText,
            style: options.destructive ? 'destructive' : 'default',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  };
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  centerWrap: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '700' },
  message: { fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnText: { fontSize: 15 },
});
