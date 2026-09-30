import React from "react";
import { View, StyleSheet, Keyboard, Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  clearLoggingSession,
  startLoggingSession,
} from "@/state/loggingSessionSlice";
import { removeMeal } from "@/state/foodSlice";
import { Chat } from "@/components/Log/Chat";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { RootState } from "@/state/store";

export default function LoggingScreen() {
  const { logMode, startRecording } = useLocalSearchParams<{
    logMode?: string;
    startRecording?: string;
  }>();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const pendingMeals = useSelector(
    (state: RootState) => state.loggingSession?.pendingMeals ?? []
  );
  const sessionActive = useSelector(
    (state: RootState) => state.loggingSession?.active ?? false
  );
  const confirmedLeave = React.useRef(false);

  React.useEffect(() => {
    navigation.setOptions({
      title: logMode === "recipe" ? "Save Recipe" : "Log Food",
    });
  }, [logMode, navigation]);


  React.useEffect(() => {
    dispatch(startLoggingSession());
  }, [dispatch]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (!sessionActive || confirmedLeave.current) return;
      event.preventDefault();
      Alert.alert(
        "Leave without logging?",
        "Your current logging session and unapproved meal will be discarded.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              confirmedLeave.current = true;
              pendingMeals.forEach((meal) => dispatch(removeMeal(meal.mealId)));
              dispatch(clearLoggingSession());
              navigation.dispatch(event.data.action);
            },
          },
        ]
      );
    });
    return unsubscribe;
  }, [dispatch, navigation, pendingMeals, sessionActive]);

  React.useEffect(() => {
    return () => {
      Keyboard.dismiss();
      dispatch(clearLoggingSession());
    };
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <Chat recordingRequestId={startRecording === "1" ? 1 : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
  },
});
