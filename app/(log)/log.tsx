import React from "react";
import { View, StyleSheet, Keyboard, Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { clearLoggingSession } from "@/state/loggingSessionSlice";
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
  const loggingSessionMessages = useSelector(
    (state: RootState) => state.loggingSession?.messages ?? []
  );
  const hasActiveSession =
    loggingSessionMessages.length > 0 || startRecording === "1";
  const confirmedLeave = React.useRef(false);

  React.useEffect(() => {
    navigation.setOptions({
      title: logMode === "recipe" ? "Save Recipe" : "Log Food",
    });
  }, [logMode, navigation]);


  React.useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (!hasActiveSession || confirmedLeave.current) return;

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
              dispatch(clearLoggingSession());
              navigation.dispatch(event.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [dispatch, hasActiveSession, navigation]);

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
