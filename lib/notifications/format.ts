// lib/notifications/format.ts
import type { AppNotification } from "../../components/notifications/context";

export const isUUID = (s: unknown) =>
  typeof s === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

export const getSwapId = (n: AppNotification) =>
  (n?.payload && (n.payload.swap_id || n.payload.swapId)) ?? null;

export type SwapMeta = {
  requested?: { title?: string | null; image_url?: string | null } | null;
  offered?: { title?: string | null; image_url?: string | null } | null;
};

export function describeNotification(
  n: AppNotification,
  meta?: SwapMeta
): { title: string; body: string; thumb?: string | null } {
  switch (n.type) {
    case "trade_offered":
      return {
        title: "New trade offer",
        body:
          meta?.offered?.title || meta?.requested?.title
            ? `${meta?.offered?.title ?? "Their item"} → ${meta?.requested?.title ?? "your item"}`
            : "Tap to view the offer",
        thumb: meta?.offered?.image_url ?? undefined,
      };
    case "trade_accepted":
      return {
        title: "Trade accepted",
        body: meta?.requested?.title ? `Accepted: ${meta.requested.title}` : "Your offer was accepted",
        thumb: meta?.requested?.image_url ?? undefined,
      };
    case "trade_declined":
      return {
        title: "Trade declined",
        body: meta?.requested?.title ? `Declined: ${meta.requested.title}` : "Your offer was declined",
        thumb: meta?.requested?.image_url ?? undefined,
      };
    default:
      return { title: "Update", body: "Open details" };
  }
}
