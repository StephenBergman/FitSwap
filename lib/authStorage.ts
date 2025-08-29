// lib/authStorage.ts
export type StorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

// This file is only for typing. Metro will replace it at runtime with
// authStorage.native.ts or authStorage.web.ts depending on the platform.
declare const storage: StorageLike;
export default storage;
