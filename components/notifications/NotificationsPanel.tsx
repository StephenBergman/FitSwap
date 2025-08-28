
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import {
  describeNotification,
  getSwapId,
  isUUID,
} from "../../lib/notifications/format";
import useSwapMeta from "../../lib/notifications/useSwapMeta";
import { useColors, useTheme } from "../../lib/theme";
import type { AppNotification } from "../notifications/context";
import { useNotifications } from "../notifications/context";

type Props = { onClose?: () => void; maxHeight?: number; style?: ViewStyle };

export default function NotificationsPanel({
  onClose,
  maxHeight = 360,
  style,
}: Props) {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const c = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";

  // Preload minimal swap metadata (titles/thumbs) for richer cards
  const metaMap = useSwapMeta(notifications);

  // Partition into unread/read once per list change
  const { unread, read } = useMemo(() => {
    const u = notifications.filter((n) => !n.is_read);
    const r = notifications.filter((n) => n.is_read);
    return { unread: u, read: r };
  }, [notifications]);

  // UI-only toggle to hide the read section. Archive can be added later.
  const [hideRead, setHideRead] = useState(false);

  // Navigate to the relevant screen for a notification
  const goTo = async (n: AppNotification) => {
    const swapId = getSwapId(n);
    await markAsRead(n.id);
    onClose?.();

    if (isUUID(swapId)) {
      router.push(`/swaps/${swapId}`);
    } else {
      // Fallback: open the list; user can pick from there
      router.push("/myswaps");
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const meta = metaMap[getSwapId(item) ?? ""];
    const d = describeNotification(item, meta);

    const unreadStyle = !item.is_read
      ? {
          // Unread: subtle left accent bar and slight contrast
          borderLeftWidth: 3,
          borderLeftColor: c.tint,
          backgroundColor: isDark ? "#0f172a" : "#EEF2FF",
        }
      : null;

    return (
      <TouchableOpacity
        onPress={() => goTo(item)}
        style={[
          styles.card,
          { backgroundColor: c.card, borderColor: c.border },
          unreadStyle,
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.row}>
          {/* Thumbnail placeholder keeps rows aligned even when missing */}
          {!!d.thumb ? (
            <Image
              source={{ uri: d.thumb }}
              style={[styles.thumb, { backgroundColor: c.bg, borderColor: c.border }]}
              resizeMode="contain"
            />
          ) : (
            <View
              style={[styles.thumb, { backgroundColor: c.bg, borderColor: c.border }]}
            />
          )}

          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
              {d.title}
            </Text>
            <Text style={[styles.body, { color: c.text }]} numberOfLines={2}>
              {d.body}
            </Text>
            <Text style={[styles.time, { color: c.muted }]}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  
  const sections = useMemo(() => {
    // If hideRead is true, the "Read" section is empty. Archive can be built later.
    const visibleRead = hideRead ? [] : read;

    return [
      unread.length ? { key: "unread", title: "Unread", data: unread } : null,
      visibleRead.length ? { key: "read", title: "Read", data: visibleRead } : null,
    ].filter(Boolean) as { key: string; title: string; data: AppNotification[] }[];
  }, [unread, read, hideRead]);

  return (
    <View style={[{ flex: 1 }, style]}>
      {/* Header actions */}
      <View style={styles.topRow}>
        <Text style={[styles.header, { color: c.text }]}>Notifications</Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={[styles.link, { color: c.tint }]}>Mark all read</Text>
          </TouchableOpacity>

          {/* Provide a soft "clear read" that just hides the read section for now */}
          {!!read.length && !hideRead && (
            <TouchableOpacity onPress={() => setHideRead(true)}>
              <Text style={[styles.link, { color: c.muted }]}>Clear all (read)</Text>
            </TouchableOpacity>
          )}
          {!!read.length && hideRead && (
            <TouchableOpacity onPress={() => setHideRead(false)}>
              <Text style={[styles.link, { color: c.muted }]}>Show read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Scrollable list; maxHeight keeps it from overfilling parent on mobile */}
      <SectionList
        sections={sections}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) =>
          section.data.length ? (
            <Text style={[styles.sectionTitle, { color: c.muted }]}>
              {section.title}
            </Text>
          ) : null
        }
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.muted }]}>You’re all caught up.</Text>
        }
        // Nested scrolling lets this list sit inside other scroll containers safely
        nestedScrollEnabled
        // Constrain height to avoid overflow; parent can override via prop
        style={{ maxHeight }}
        contentContainerStyle={{ paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const THUMB = 44;

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  header: { fontSize: 16, fontWeight: "700" },
  link: { fontSize: 12, textDecorationLine: "underline" },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 4,
  },

  card: {
    borderRadius: 10,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },

  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },

  title: { fontWeight: "700", marginBottom: 2 },
  body: { fontSize: 13, marginBottom: 4 },
  time: { fontSize: 11 },

  empty: { textAlign: "center", paddingVertical: 18 },
});
