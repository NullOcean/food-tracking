import React from "react";
import { View, StyleSheet, Keyboard } from "react-native";
import { useDispatch } from "react-redux";
import { logMeal } from "@/state/foodSlice";
import { clearLoggingSession } from "@/state/loggingSessionSlice";
import { Chat } from "@/components/Log/Chat";
import { useLocalSearchParams, useNavigation } from "expo-router";

export default function LoggingScreen() {
  const { logMode } = useLocalSearchParams();
  const navigation = useNavigation();

  React.useEffect(() => {
    navigation.setOptions({
      title: logMode === "recipe" ? "Save Recipe" : "Log Food",
    });
  }, [logMode, navigation]);

  const mealId = React.useRef<string | undefined>(undefined);
  const dispatch = useDispatch();

  React.useEffect(() => {
    return () => {
      Keyboard.dismiss();
      if (mealId.current) {
        dispatch(logMeal(mealId.current));
      }
      dispatch(clearLoggingSession());
    };
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <Chat
        onMealRetrieval={(thisMealId) => {
          mealId.current = thisMealId;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
  },
});
