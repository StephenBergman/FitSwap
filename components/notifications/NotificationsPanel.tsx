// components/NotificationsPanel.tsx
// Scrollable list of cards; tapping navigates to the relevant screen.
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors, useTheme } from "../../lib/theme";
import { useNotifications } from "../notifications/context";

type Props = { onClose?: () => void };

export default function NotificationsPanel({ onClose }: Props) {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const c = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";

   const goTo = async (n: any) => {
    const swapId = n?.payload?.swap_id;
    await markAsRead(n.id);
    if (onClose) onClose();
    if (swapId) {
      router.push(`/swaps/[Id]`); 
    }
  };

  const renderItem = ({ item }: any) => {
    const title =
      item.type === "trade_offered"
        ? "New trade offer"
        : item.type === "trade_accepted"
        ? "Trade accepted"
        : item.type === "trade_declined"
        ? "Trade declined"
        : "Update";
    const ts = new Date(item.created_at).toLocaleString();

    const unreadStyle = !item.is_read
      ? // Unread styling that works in light and dark:
        // subtle left accent bar using brand tint, and slight background contrast
        {
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
      >
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        <Text numberOfLines={2} style={[styles.body, { color: c.text }]}>
          {item.payload?.swap_id ? `Swap #${item.payload.swap_id}` : "Open details"}
        </Text>
        <Text style={[styles.time, { color: c.muted }]}>{ts}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: c.text }]}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={[styles.clear, { color: c.tint }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 8 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.muted }]}>
            You are all caught up.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  header: { fontSize: 16, fontWeight: "700" },
  clear: { fontSize: 12, textDecorationLine: "underline" },
  card: {
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: { fontWeight: "700", marginBottom: 4 },
  body: { fontSize: 13, marginBottom: 6 },
  time: { fontSize: 11 },
  empty: { textAlign: "center", paddingVertical: 18 },
});
