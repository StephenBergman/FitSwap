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
import FSButton from '../buttons/FSButton';

/**
 * Options the caller can pass when requesting confirmation.
 * confirmVariant is optional and lets the caller override the confirm button styling.
 */
export type ConfirmOptions = {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean; // if true, confirm button uses "danger" styling
  confirmVariant?: 'primary' | 'secondary' | 'success' | 'danger';
};

type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>;
type ConfirmContextValue = { confirm: ConfirmFn };

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const DEFAULTS: Required<Omit<ConfirmOptions, 'confirmVariant'>> = {
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

  // Open the dialog and return a promise that resolves with the user's choice.
  const confirm: ConfirmFn = (options) =>
    new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpts({ ...DEFAULTS, ...(options ?? {}) });
      setVisible(true);
    });

  // Resolve the pending promise and close the dialog.
  const resolveAndClose = (value: boolean) => {
    setVisible(false);
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.(value);
  };

  // Android hardware back closes the dialog like "Cancel".
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      resolveAndClose(false);
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  // Esc key on web closes the dialog like "Cancel".
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolveAndClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  // Choose the confirm button variant.
  const confirmVariant =
    opts.confirmVariant ?? (opts.destructive ? 'danger' : 'success');

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Overlay instead of <Modal/> to avoid Android layout glitches */}
      {visible && (
        <View style={styles.portalRoot} pointerEvents="box-none" collapsable={false}>
          {/* Click outside to cancel */}
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
              <FSButton
                title={opts.cancelText ?? 'Cancel'}
                variant="secondary"
                size="sm"
                onPress={() => resolveAndClose(false)}
                block={false}
              />
              <FSButton
                title={opts.confirmText ?? 'OK'}
                variant={confirmVariant}
                size="sm"
                onPress={() => resolveAndClose(true)}
                block={false}
              />
            </View>
          </View>
        </View>
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Hook used by callers to open the confirm dialog.
 * It falls back to the native Alert/confirm if the provider isn't mounted.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (ctx) return ctx.confirm;

  // Fallback path so callers can still confirm even if the provider isn't on screen yet.
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
  // Full-screen overlay container
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
});
