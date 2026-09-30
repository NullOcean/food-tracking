import { Meal } from "@/types/openAi.types";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MealSummary from "../Shared/MealSummary";
import { useDispatch } from "react-redux";
import { logMeal } from "@/state/foodSlice";
import { clearLoggingSession } from "@/state/loggingSessionSlice";
import { router } from "expo-router";
import { ThemedText } from "../ThemedText";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Ionicons } from "@expo/vector-icons";
export type MessageProps = {
  from: MessageFrom;
  content: string;
  meal?: Meal;
  onApproveMeal?: (meal: Meal) => void;
  onRemoveMeal?: (meal: Meal) => void;
};

export enum MessageFrom {
  USER = "Andrew",
  GPT = "Nourishly",
}

export type Message = {
  from: MessageFrom;
  contents: string;
  meal?: Meal;
};

export const Message = ({
  from,
  content,
  meal,
  onApproveMeal,
  onRemoveMeal,
}: MessageProps) => {
  const theme = useAppTheme();
  const loading = content === "...";
  const dispatch = useDispatch();

  const addMeal = () => {
    if (!meal) return;
    if (onApproveMeal) {
      onApproveMeal(meal);
      return;
    }
    dispatch(logMeal(meal.mealId));
    dispatch(clearLoggingSession());
    router.back();
  };

  return (
    <View
      style={{
        ...styles.container,
        justifyContent: from === MessageFrom.GPT ? "flex-start" : "flex-end",
      }}
    >
      <View
        style={{
          ...styles.message,
          ...(from === MessageFrom.GPT
            ? { backgroundColor: theme.surfaceRaised }
            : { backgroundColor: theme.accentSoft }),
          ...{ width: meal ? "100%" : "60%" },
        }}
      >
        <ThemedText
          colorOverride={from === MessageFrom.GPT ? theme.text : theme.text}
          style={{ fontSize: 18 }}
        >
          {content}
        </ThemedText>
        {meal && (
          <View style={styles.mealContainer}>
            <MealSummary
              embedded
              mealId={meal.mealId}
              onAdd={addMeal}
              allowAdding
            />
            {onRemoveMeal && (
              <TouchableOpacity
                accessibilityLabel={`Remove ${meal.meal} from this log`}
                onPress={() => onRemoveMeal(meal)}
                style={styles.removeMealButton}
              >
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
                <ThemedText colorOverride={theme.danger}>Remove from this log</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 12,
    flexDirection: "row",
  },
  message: {
    width: "60%",
    borderRadius: 16,
    padding: 12,
    fontSize: 18,
  },
  mealContainer: {
    paddingTop: 8,
  },
  removeMealButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 6,
    paddingTop: 8,
  },
});
