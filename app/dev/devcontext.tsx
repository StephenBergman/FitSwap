// dev/DevContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { canShowDevUI } from './devgate';

type Flags = {
  includeSelfSwaps: boolean;
  // add more here as needed.
};

type DevState = {
  enabled: boolean;            // Dev Mode master switch
  visible: boolean;            // whether user can see the dev UI at all
  flags: Flags;
  setFlag: <K extends keyof Flags>(k: K, v: Flags[K]) => void;
  setEnabled: (v: boolean) => void;
};

const DevContext = createContext<DevState | null>(null);

export function DevProvider({ user, children }: { user?: any; children: React.ReactNode }) {
  const visible = canShowDevUI(user);
  const [enabled, setEnabled] = useState(visible && __DEV__); // default on in dev builds
  const [flags, setFlags] = useState<Flags>({ includeSelfSwaps: __DEV__ });

  // Persist per-user, per-device
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const base = `dev:${user.id}:`;
      const en = await AsyncStorage.getItem(base + 'enabled');
      const f1 = await AsyncStorage.getItem(base + 'includeSelfSwaps');
      if (en != null) setEnabled(en === '1');
      if (f1 != null) setFlags(s => ({ ...s, includeSelfSwaps: f1 === '1' }));
    })();
  }, [user?.id]);

  const setFlag: DevState['setFlag'] = (k, v) => {
    setFlags(prev => {
      const next = { ...prev, [k]: v };
      if (user?.id) {
        AsyncStorage.setItem(`dev:${user.id}:${String(k)}`, v ? '1' : '0');
      }
      return next;
    });
  };

  useEffect(() => {
    if (user?.id) AsyncStorage.setItem(`dev:${user.id}:enabled`, enabled ? '1' : '0');
  }, [enabled, user?.id]);

  return (
    <DevContext.Provider value={{ enabled, visible, flags, setFlag, setEnabled }}>
      {children}
    </DevContext.Provider>
  );
}

export const useDev = () => {
  const ctx = useContext(DevContext);
  if (!ctx) throw new Error('useDev must be used inside DevProvider');
  return ctx;
};
