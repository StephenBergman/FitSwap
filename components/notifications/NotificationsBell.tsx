// components/NotificationsBell.tsx
// Bell icon with unread badge, toggles a dropdown panel anchored under the bell.

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "../../lib/theme";
import { useNotifications } from "../notifications/context";
import NotificationsPanel from "./NotificationsPanel";

export default function NotificationsBell() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const c = useColors();

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        style={{ paddingHorizontal: 8, paddingVertical: 4 }}
      >
        <Ionicons name="notifications-outline" size={24} color={c.text} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: c.tint }]}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* lightweight "dropdown" using a transparent modal anchored to top-right */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View />
        </Pressable>
        <View
          style={[
            styles.dropdownContainer,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          <NotificationsPanel onClose={() => setOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}

const W = Dimensions.get("window").width;
const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: 2,
    top: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)" },
  dropdownContainer: {
    position: "absolute",
    top: 60, // adjust to match header height
    right: 8,
    width: Math.min(420, W - 16),
    maxHeight: 420,
    borderRadius: 12,
    padding: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    borderWidth: StyleSheet.hairlineWidth,
  },
});
