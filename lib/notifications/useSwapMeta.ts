// lib/notifications/useSwapMeta.ts
import { useEffect, useState } from "react";
import type { AppNotification } from "../../components/notifications/context";
import { getSwapId, isUUID, type SwapMeta } from "../notifications/format";
import { supabase } from "../supabase";

/**
 * Batches a single fetch of swap metadata (titles/images) for the
 * notifications currently in view.
 */
export default function useSwapMeta(notifications: AppNotification[]) {
  const [map, setMap] = useState<Record<string, SwapMeta>>({});

  useEffect(() => {
    const ids = Array.from(
      new Set(
        notifications
          .map(getSwapId)
          .filter((v): v is string => isUUID(v))
      )
    );
    if (!ids.length) {
      setMap({});
      return;
    }

    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("swaps")
        .select(
          `
          id,
          item:item_id (title,image_url),
          offered_item:offered_item_id (title,image_url)
        `
        )
        .in("id", ids);

      if (!mounted || error) return;

      const next: Record<string, SwapMeta> = {};
      for (const row of data ?? []) {
        const requested = Array.isArray(row.item) ? row.item[0] : row.item;
        const offered = Array.isArray(row.offered_item) ? row.offered_item[0] : row.offered_item;
        next[row.id] = { requested, offered };
      }
      setMap(next);
    })();

    return () => {
      mounted = false;
    };
  }, [notifications]);

  return map;
}
