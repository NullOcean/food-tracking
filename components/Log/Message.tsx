import { Meal } from "@/types/openAi.types";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MealSummary from "../Shared/MealSummary";
import { useDispatch } from "react-redux";
import { logMeal } from "@/state/foodSlice";
import { clearLoggingSession } from "@/state/loggingSessionSlice";
import { router } from "expo-router";
import { ThemedText } from "../ThemedText";
import { useAppTheme } from "@/hooks/useAppTheme";
export type MessageProps = {
  from: MessageFrom;
  content: string;
  meal?: Meal;
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

export const Message = ({ from, content, meal }: MessageProps) => {
  const theme = useAppTheme();
  const loading = content === "...";
  const dispatch = useDispatch();

  const addMeal = () => {
    if (!meal) return;
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
});
