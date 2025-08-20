import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
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

  const confirm: ConfirmFn = (options) =>
    new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpts({ ...DEFAULTS, ...(options ?? {}) });
      setVisible(true);
    });

  const resolveAndClose = (value: boolean) => {
    setVisible(false);
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.(value);
  };

  // Android back button
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      resolveAndClose(false);
      return true;
    });
    return () => sub.remove();
  }, [visible]);

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

      {/* Absolute overlay instead of <Modal/> to avoid Android layout glitches */}
      {visible && (
        <View style={styles.portalRoot} pointerEvents="box-none" collapsable={false}>
          <Pressable
            style={styles.backdrop}
            onPress={() => resolveAndClose(false)}
            android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: true }}
          />
          <View
            style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}
            accessibilityRole="alert"
            accessible
            pointerEvents="auto"
          >
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
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (ctx) return ctx.confirm;

  // Fallback if provider isn’t mounted yet
  return async (o?: ConfirmOptions) => {
    const options = { ...DEFAULTS, ...(o ?? {}) };
    if (Platform.OS === 'web') {
      const text = options.title
        ? `${options.title}\n\n${options.message ?? ''}`
        : options.message ?? '';
      return window.confirm(text);
    }
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
  // full-screen overlay above the app
  portalRoot: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 10000,
    elevation: 10000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    width: '90%',
    maxWidth: 420,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
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
