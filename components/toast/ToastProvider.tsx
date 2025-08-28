// components/toast/ToastProvider.tsx
import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

type ToastPayload = { message: string; durationMs?: number };
type ToastFn = (p: ToastPayload) => void;

const ToastCtx = createContext<ToastFn | null>(null);

export function useToast(): ToastFn {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);

  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeIn = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const fadeOut = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const show = useCallback<ToastFn>(
    ({ message, durationMs = 2000 }) => {
      if (!message) return;

      // Cancel any pending hide
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }

      // Update text and show
      setMsg(message);
      fadeIn();

      // Schedule fade out (no setState inside animation callbacks)
      hideTimer.current = setTimeout(() => {
        fadeOut();
      }, durationMs);
    },
    [fadeIn, fadeOut]
  );

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const ctx = useMemo(() => show, [show]);

  return (
    <ToastCtx.Provider value={ctx}>
      {children}

      {/* Always mounted; visibility handled purely by opacity */}
      <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
        {!!msg && (
          <View style={styles.toast}>
            <Text style={styles.text}>{msg}</Text>
          </View>
        )}
      </Animated.View>
    </ToastCtx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: 'center',
    // ensure it sits above content on Android
    zIndex: 9999,
    elevation: 10,
  },
  toast: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  text: { color: '#fff', fontWeight: '700' },
});
