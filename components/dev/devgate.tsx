const IS_BUILD_DEV = __DEV__;
const ENV_DEV = process.env.EXPO_PUBLIC_ENABLE_DEV_UI === '1';
const DEV_USER_ID = process.env.EXPO_PUBLIC_DEV_USER_ID ?? '';
const isAllowedDevUser = (uid?: string, meta?: any) =>
  !!uid && (
    uid === DEV_USER_ID ||
    meta?.is_staff === true ||
    (meta?.roles ?? []).includes('admin')
  );

export function canShowDevUI(user?: { id?: string; user_metadata?: any; app_metadata?: any }) {
  return IS_BUILD_DEV || ENV_DEV || isAllowedDevUser(user?.id, { 
    ...user?.user_metadata, 
    roles: user?.app_metadata?.roles 
  });
}