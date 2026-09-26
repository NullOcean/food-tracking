import { ThemedText } from "@/components/ThemedText";
import { useAppTheme } from "@/hooks/useAppTheme";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function SettingsScreen() {
  const theme = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
});
