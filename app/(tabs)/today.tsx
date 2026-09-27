import React from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
} from "react-native";

import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/state/store";
import { getSummedMacros, sortMealsByLoggedAt } from "@/helpers/food-utils";
import {
  DAY_SUMMARY_MAX_AGE_MS,
  createDaySummarySignature,
  shouldRefreshDaySummary,
} from "@/helpers/day-summary";
import MealSummary from "@/components/Shared/MealSummary";
import { ProgressBar } from "@/components/Shared/ProgressBar";
import { ThemedText } from "@/components/ThemedText";
import { Meal } from "@/types/openAi.types";
import {
  defaultFocusedMetrics,
  addPreferences,
  setDailySummary,
} from "@/state/userDataSlice";
import type { UserMemory } from "@/state/userDataSlice";
import { parseMeal, summarizeDay, transcribeAudio } from "@/services/open-ai";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { logMeal, recordMeal } from "@/state/foodSlice";
import AddSVG from "../../svg/log.svg";
import SpeakSVG from "../../svg/speak.svg";
import { useAppTheme } from "@/hooks/useAppTheme";
import { LinearGradient } from "react-native-gradients";
import { Ionicons } from "@expo/vector-icons";

export default function TodayScreen() {
  const theme = useAppTheme();
  const dispatch = useDispatch();
  const {
    isRecording: isQuickRecording,
    isBusy: isQuickRecordingBusy,
    metering: quickRecordingMetering,
    startRecording,
    stopRecording,
    discardRecording,
  } = useVoiceRecorder();
  const [isQuickTranscribing, setIsQuickTranscribing] = React.useState(false);
  const keyboardBounce = React.useRef(new Animated.Value(0)).current;
  const date = new Date();
  const todayDate = `${date.getFullYear()}${
    date.getMonth() + 1
  }${date.getDate()}`;
  const allMeals = useSelector((state: RootState) => state.food.meals);
  const meals = React.useMemo(
    () =>
      sortMealsByLoggedAt(
        allMeals.filter(
          (meal) => meal?.isAdded && meal?.date === todayDate && !meal?.recipe
        )
      ),
    [allMeals, todayDate]
  );
  const todayMacros = React.useMemo(() => getSummedMacros(meals), [meals]);
  const goals = useSelector((state: RootState) => state.userData.goals);
  const replacements = useSelector(
    (state: RootState) => state.userData.replacements ?? []
  );
  const memory: UserMemory = useSelector((state: RootState) => ({
    likes: state.userData.likes ?? [],
    dislikes: state.userData.dislikes ?? [],
    preferences: state.userData.preferences ?? [],
  }));
  const focusedMetrics = useSelector(
    (state: RootState) => state.userData.focusedMetrics ?? defaultFocusedMetrics
  );
  const dailySummary = useSelector(
    (state: RootState) => state.userData.dailySummary ?? null
  );
  const summarySignature = createDaySummarySignature(
    todayDate,
    goals,
    todayMacros
  );
  const shouldRefreshSummary = shouldRefreshDaySummary(
    dailySummary,
    todayDate,
    summarySignature
  );
  const requestInFlightFor = React.useRef<string | undefined>(undefined);
  const latestSummarySignature = React.useRef(summarySignature);
  latestSummarySignature.current = summarySignature;
  const [, setSummaryRefreshTick] = React.useState(0);
  const [isSummarizing, setIsSummarizing] = React.useState(false);

  React.useEffect(() => {
    if (
      !shouldRefreshSummary ||
      requestInFlightFor.current === summarySignature
    ) {
      return;
    }

    requestInFlightFor.current = summarySignature;
    setIsSummarizing(true);

    void summarizeDay({
      currentTime: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      goals,
      consumed: todayMacros,
    })
      .then((content) => {
        if (!content) return;
        if (latestSummarySignature.current !== summarySignature) {
          console.info("[day-summary] response superseded by newer day data", {
            responseSignature: summarySignature,
            currentSignature: latestSummarySignature.current,
          });
          return;
        }
        console.info("[day-summary] applying summary to today view", {
          summaryLength: content.length,
        });
        dispatch(
          setDailySummary({
            date: todayDate,
            content,
            inputSignature: summarySignature,
            generatedAt: Date.now(),
          })
        );
      })
      .finally(() => {
        if (requestInFlightFor.current === summarySignature) {
          requestInFlightFor.current = undefined;
          setIsSummarizing(false);
        }
      });
  }, [dispatch, goals, shouldRefreshSummary, summarySignature, todayDate, todayMacros]);

  React.useEffect(() => {
    if (
      !dailySummary ||
      dailySummary.date !== todayDate ||
      dailySummary.inputSignature !== summarySignature
    ) {
      return;
    }

    const remainingMs = Math.max(
      DAY_SUMMARY_MAX_AGE_MS - (Date.now() - dailySummary.generatedAt),
      0
    );
    const timer = setTimeout(() => setSummaryRefreshTick(Date.now()), remainingMs);
    return () => clearTimeout(timer);
  }, [dailySummary, summarySignature, todayDate]);

  const isCurrentSummary =
    dailySummary?.date === todayDate &&
    dailySummary.inputSignature === summarySignature;

  React.useEffect(() => {
    if (!isQuickRecording) {
      keyboardBounce.stopAnimation();
      keyboardBounce.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(keyboardBounce, {
          toValue: -8,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(keyboardBounce, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isQuickRecording, keyboardBounce]);

  const startQuickRecording = async () => {
    const result = await startRecording();
    if (result === "permission-denied") {
      Alert.alert("Microphone access needed", "Allow microphone access in Settings, or use the keyboard instead.");
    } else if (result === "error") {
      Alert.alert("Couldn't start recording", "Please try again or use the keyboard.");
    }
  };

  const finishQuickRecording = async () => {
    const uri = await stopRecording();
    if (!uri) {
      Alert.alert("Couldn't finish recording", "Please try again or use the keyboard.");
      return;
    }

    setIsQuickTranscribing(true);
    try {
      const transcript = await transcribeAudio(uri);
      if (!transcript) {
        Alert.alert("Couldn't transcribe that", "Please try again or use the keyboard.");
        return;
      }

      const recipes = allMeals.filter((meal) => meal.isAdded && meal.recipe);
      const response = await parseMeal(
        transcript,
        [],
        recipes,
        replacements,
        memory,
        { allowLearnedPreferences: true }
      );
      if ("error" in response) {
        Alert.alert("Couldn't understand that meal", response.error);
        return;
      }
      if (!response.meal) {
        router.push({
          pathname: "/(log)/log",
          params: { logMode: "meal", initialTranscript: transcript },
        });
        return;
      }

      const { learnedPreferences, ...recordableMeal } = response;
      if (learnedPreferences?.length) {
        dispatch(addPreferences(learnedPreferences));
      }
      dispatch(recordMeal(recordableMeal));
      dispatch(logMeal(recordableMeal.mealId));
    } finally {
      setIsQuickTranscribing(false);
    }
  };

  const cancelQuickRecordingToChat = async () => {
    await discardRecording();
    router.push({ pathname: "/(log)/log", params: { logMode: "meal" } });
  };

  return (
    <View style={[styles.todayContainer, { backgroundColor: theme.background }]}>
      <View
        style={{
          position: "absolute",
          height: "100%",
          width: "100%",
          zIndex: 1,
        }}
        pointerEvents="none"
      >
        <LinearGradient
          angle={270}
          colorList={[
            { offset: "0%", color: theme.background, opacity: "0" },
            { offset: "80%", color: theme.background, opacity: "0" },
            { offset: "95%", color: theme.background, opacity: "1" },
          ]}
        />
      </View>
      <View>
        <View style={styles.macros}>
          {focusedMetrics.map((macro) => (
            <ProgressBar
              key={macro}
              textColor={theme.text}
              macro={macro}
              amount={todayMacros[macro]}
            />
          ))}
        </View>
      </View>
      <View style={[styles.dailySummary, { backgroundColor: theme.surface }]}>
        <ThemedText type="defaultSemiBold" style={[styles.dailySummaryTitle, { color: theme.accent }]}>
          Today’s take
        </ThemedText>
        <ThemedText style={[styles.dailySummaryText, { color: theme.text }]}>
          {isCurrentSummary
            ? dailySummary.content
            : isSummarizing
              ? "Updating your day’s take…"
              : "Your day’s take will appear here shortly."}
        </ThemedText>
      </View>
      <ScrollView>
        <View style={{ ...styles.mealsListContainer }}>
          {meals.map((meal: Meal) => (
            <MealSummary mealId={meal.mealId} key={meal.mealId} />
          ))}
        </View>
      </ScrollView>
      <View style={styles.logButton}>
        {isQuickRecording && (
          <Animated.View
            style={[
              styles.keyboardShortcut,
              { transform: [{ translateY: keyboardBounce }] },
            ]}
          >
            <TouchableOpacity
              onPress={cancelQuickRecordingToChat}
              accessibilityLabel="Cancel recording and open keyboard"
            >
              <Ionicons name="keypad-outline" size={30} color={theme.text} />
            </TouchableOpacity>
          </Animated.View>
        )}
        <TouchableOpacity
          disabled={isQuickRecordingBusy || isQuickTranscribing}
          onPress={isQuickRecording ? finishQuickRecording : startQuickRecording}
          style={styles.logButtonPressable}
          accessibilityLabel={
            isQuickRecording ? "Stop recording and log food" : "Record food"
          }
        >
          {isQuickTranscribing ? (
            <ActivityIndicator color={theme.accent} size="large" />
          ) : isQuickRecording ? (
            <View style={styles.recordingButtonContent}>
              <SpeakSVG width={80} height={80} color={theme.recording} />
              <ThemedText style={[styles.meteringBadge, { backgroundColor: theme.overlay, color: theme.text }]}>
                {formatDecibels(quickRecordingMetering)}
              </ThemedText>
            </View>
          ) : (
            <AddSVG width={80} height={80} color={theme.accent} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatDecibels(metering: number | undefined) {
  return metering === undefined ? "— dB" : `${Math.round(metering)} dB`;
}

const styles = StyleSheet.create({
  todayContainer: {
    flexDirection: "column",
    flex: 1,
    gap: 12,
    paddingBottom: 12,
  },
  mealsListContainer: {
    flexDirection: "column",
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: "100%",
  },
  logButtonContainer: {},
  todayList: {
    marginHorizontal: 24,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    padding: 12,
  },
  macros: {
    paddingHorizontal: 12,
  },
  dailySummary: {
    marginHorizontal: 12,
    borderRadius: 10,
    padding: 12,
  },
  dailySummaryTitle: {
    marginBottom: 4,
  },
  dailySummaryText: {
    lineHeight: 20,
  },
  logButton: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    alignItems: "center",
    zIndex: 1,
  },
  logButtonPressable: {
    zIndex: 2,
  },
  recordingButtonContent: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  meteringBadge: {
    position: "absolute",
    bottom: 4,
    borderRadius: 8,
    overflow: "hidden",
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 5,
  },
  keyboardShortcut: {
    position: "absolute",
    bottom: 86,
    width: "100%",
    alignItems: "center",
    zIndex: 2,
  },

  logButtonGrad: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    alignItems: "center",
    zIndex: 1000,
  },
});
