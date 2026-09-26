import { ThemedText } from "@/components/ThemedText";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  addReplacement,
  FoodReplacement,
  removeReplacement,
  updateReplacement,
} from "@/state/userDataSlice";
import { RootState } from "@/state/store";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

export default function MemoryScreen() {
  const theme = useAppTheme();
  const dispatch = useDispatch();
  const replacements = useSelector(
    (state: RootState) => state.userData.replacements ?? []
  );
  const [trigger, setTrigger] = useState("");
  const [replacement, setReplacement] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const clearForm = () => {
    setTrigger("");
    setReplacement("");
    setEditingId(null);
  };

  const save = () => {
    const next = { trigger: trigger.trim(), replacement: replacement.trim() };
    if (!next.trigger || !next.replacement) {
      Alert.alert("Add both fields", "Enter the phrase and what it should mean.");
      return;
    }
    if (editingId) {
      dispatch(updateReplacement({ id: editingId, ...next }));
    } else {
      const item: FoodReplacement = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...next,
      };
      dispatch(addReplacement(item));
    }
    clearForm();
  };

  const edit = (item: FoodReplacement) => {
    setEditingId(item.id);
    setTrigger(item.trigger);
    setReplacement(item.replacement);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText style={[styles.intro, { color: theme.textMuted }]}> 
          Save shorthand for foods you have often. When you mention the phrase while
          logging, it will be interpreted as the food and amount you specify here.
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.surface }]}> 
          <ThemedText type="defaultSemiBold">When I say...</ThemedText>
          <TextInput
            value={trigger}
            onChangeText={setTrigger}
            placeholder="coffee"
            placeholderTextColor={theme.textSubtle}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            accessibilityLabel="Replacement phrase"
          />
          <ThemedText type="defaultSemiBold">I mean...</ThemedText>
          <TextInput
            value={replacement}
            onChangeText={setReplacement}
            placeholder="two shots of espresso + 8 oz 2% milk + a packet of sugar"
            placeholderTextColor={theme.textSubtle}
            style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.border }]}
            multiline
            accessibilityLabel="Replacement food"
          />
          <View style={styles.formButtons}>
            {editingId && (
              <Pressable style={styles.cancelButton} onPress={clearForm}>
                <ThemedText colorOverride={theme.textSubtle}>Cancel</ThemedText>
              </Pressable>
            )}
            <Pressable style={[styles.saveButton, { backgroundColor: theme.accent }]} onPress={save}>
              <ThemedText type="defaultSemiBold" colorOverride={theme.textOnAccent}>
                {editingId ? "Save changes" : "Add replacement"}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {replacements.map((item) => (
          <View key={item.id} style={[styles.item, { backgroundColor: theme.surface }]}> 
            <View style={styles.itemText}>
              <ThemedText type="defaultSemiBold">“{item.trigger}”</ThemedText>
              <ThemedText style={{ color: theme.textSubtle }}>{item.replacement}</ThemedText>
            </View>
            <View style={styles.itemActions}>
              <Pressable onPress={() => edit(item)} accessibilityLabel={`Edit ${item.trigger}`}>
                <ThemedText colorOverride={theme.accent}>Edit</ThemedText>
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert("Delete replacement?", `Remove “${item.trigger}”?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => dispatch(removeReplacement(item.id)) },
                  ])
                }
                accessibilityLabel={`Delete ${item.trigger}`}
              >
                <ThemedText colorOverride={theme.danger}>Delete</ThemedText>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  intro: { lineHeight: 20, marginBottom: 20 },
  card: { borderRadius: 10, padding: 16 },
  input: { borderWidth: 1, borderRadius: 8, fontSize: 16, marginBottom: 16, marginTop: 8, padding: 10 },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  formButtons: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 12 },
  cancelButton: { padding: 12 },
  saveButton: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 },
  item: { borderRadius: 10, flexDirection: "row", justifyContent: "space-between", marginTop: 12, padding: 16 },
  itemText: { flex: 1, gap: 4, paddingRight: 12 },
  itemActions: { alignItems: "flex-end", gap: 12 },
});
