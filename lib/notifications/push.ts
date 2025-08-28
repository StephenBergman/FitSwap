// lib/notifications.ts
// Helpers for saving user push preferences (and later: device tokens)

import * as Notifications from "expo-notifications";
import { supabase } from "../supabase";

export async function requestPushPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function registerDeviceTokenIfAllowed() {
  const ok = await requestPushPermission();
  if (!ok) return null;

  // IMPORTANT: on iOS you need a real device + APNs; on Android a device/emulator is fine with FCM
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: "<your-project-id>" })).data;

  const { data: userResp } = await supabase.auth.getUser();
  const userId = userResp.user?.id;
  if (!userId) return token;

  // Save token on your profiles table (assumes a "profiles" table with push_token column)
  await supabase.from("profiles").update({ push_token: token }).eq("id", userId);

  return token;
}

export async function setPushPref(enabled: boolean) {
  const { data: userResp } = await supabase.auth.getUser();
  const userId = userResp.user?.id;
  if (!userId) return;

  await supabase.from("profiles").update({ push_enabled: enabled }).eq("id", userId);
}
