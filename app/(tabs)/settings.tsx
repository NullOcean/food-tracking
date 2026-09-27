import { ThemedText } from "@/components/ThemedText";
import { useAppTheme } from "@/hooks/useAppTheme";
import { router } from "expo-router";
import type { RootState } from "@/state/store";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";

export default function SettingsScreen() {
  const theme = useAppTheme();
  const currentState = useSelector((state: RootState) => state);
  const [showDevState, setShowDevState] = React.useState(false);
  const formattedState = React.useMemo(
    () => JSON.stringify(currentState, null, 2),
    [currentState]
  );

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
    >
      <ThemedText type="title" style={styles.title}>
        Settings
      </ThemedText>
      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: theme.surface }]}
        onPress={() => router.push("/settings/recipes")}
        accessibilityRole="button"
        accessibilityLabel="Recipes"
      >
        <View>
          <ThemedText type="defaultSemiBold">Recipes</ThemedText>
          <ThemedText style={[styles.description, { color: theme.textSubtle }]}>
            Create and manage your saved foods
          </ThemedText>
        </View>
        <ThemedText style={[styles.chevron, { color: theme.textSubtle }]}>›</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, styles.menuItemSpaced, { backgroundColor: theme.surface }]}
        onPress={() => router.push("/settings/memory")}
        accessibilityRole="button"
        accessibilityLabel="Memory"
      >
        <View>
          <ThemedText type="defaultSemiBold">Memory</ThemedText>
          <ThemedText style={[styles.description, { color: theme.textSubtle }]}>
            Teach the app your usual foods and phrases
          </ThemedText>
        </View>
        <ThemedText style={[styles.chevron, { color: theme.textSubtle }]}>›</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, styles.menuItemSpaced, { backgroundColor: theme.surface }]}
        onPress={() => router.push("/settings/focus")}
        accessibilityRole="button"
        accessibilityLabel="Focus"
      >
        <View>
          <ThemedText type="defaultSemiBold">Focus</ThemedText>
          <ThemedText style={[styles.description, { color: theme.textSubtle }]}>
            Choose the metrics shown in summaries
          </ThemedText>
        </View>
        <ThemedText style={[styles.chevron, { color: theme.textSubtle }]}>›</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, styles.menuItemSpaced, { backgroundColor: theme.surface }]}
        onPress={() => router.push("/settings/goals")}
        accessibilityRole="button"
        accessibilityLabel="Goals"
      >
        <View>
          <ThemedText type="defaultSemiBold">Goals</ThemedText>
          <ThemedText style={[styles.description, { color: theme.textSubtle }]}>
            Customize your daily nutrition targets
          </ThemedText>
        </View>
        <ThemedText style={[styles.chevron, { color: theme.textSubtle }]}>›</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.menuItem, styles.menuItemSpaced, { backgroundColor: theme.surface }]}
        onPress={() => setShowDevState((visible) => !visible)}
        accessibilityRole="button"
        accessibilityLabel="Developer state"
        accessibilityState={{ expanded: showDevState }}
      >
        <View>
          <ThemedText type="defaultSemiBold">Developer state</ThemedText>
          <ThemedText style={[styles.description, { color: theme.textSubtle }]}>
            Inspect the live Redux state, including memory
          </ThemedText>
        </View>
        <ThemedText style={[styles.chevron, { color: theme.textSubtle }]}>
          {showDevState ? "⌄" : "›"}
        </ThemedText>
      </TouchableOpacity>
      {showDevState && (
        <View style={[styles.stateCard, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.stateHint, { color: theme.textMuted }]}>
            Live state JSON. It updates as you edit memory or log meals.
          </ThemedText>
          <ScrollView
            horizontal
            style={[styles.statePreview, { backgroundColor: theme.background }]}
          >
            <ScrollView
              nestedScrollEnabled
              style={styles.stateVerticalPreview}
              contentContainerStyle={styles.statePreviewContent}
            >
              <Text selectable style={[styles.stateText, { color: theme.text }]}>
                {formattedState}
              </Text>
            </ScrollView>
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 24,
  },
  menuItem: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemSpaced: {
    marginTop: 12,
  },
  description: {
    fontSize: 14,
  },
  chevron: {
    fontSize: 30,
    lineHeight: 30,
  },
  stateCard: {
    borderRadius: 10,
    marginTop: 12,
    padding: 16,
  },
  stateHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  statePreview: {
    maxHeight: 420,
    borderRadius: 8,
  },
  stateVerticalPreview: {
    maxHeight: 420,
  },
  statePreviewContent: {
    padding: 12,
  },
  stateText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
});
