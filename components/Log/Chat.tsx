import React from "react";
import {
  Text,
  Button,
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  useVoiceRecorder,
} from "@/hooks/useVoiceRecorder";
import {
  parseMealSession,
  parseMealRecipe,
  transcribeAudio,
  utilizeRecipes,
} from "@/services/open-ai";
import { logMeal, recordMeal, removeMeal } from "@/state/foodSlice";
import {
  approvePendingMeal,
  appendLoggingMessages,
  clearLoggingSession,
  removePendingMeal,
  replacePendingMeals,
} from "@/state/loggingSessionSlice";
import { addPreferences } from "@/state/userDataSlice";
import type { UserMemory } from "@/state/userDataSlice";
import { useSelector, useDispatch } from "react-redux";
import { Message, MessageFrom } from "./Message";
import { Meal } from "@/types/openAi.types";
import { ButtonStyle, ThemedButton } from "../ThemedButton";
import SpeakSVG from "../../svg/speak.svg";
import { useAppTheme } from "@/hooks/useAppTheme";
import { router, useLocalSearchParams } from "expo-router";
import { RootState } from "@/state/store";
import { Ionicons } from "@expo/vector-icons";

export type ChatProps = {
  onMealRetrieval?: (mealId: string) => void;
  /**
   * Lets a screen reuse the chat's text, voice, transcription, and message UI
   * while owning the meaning of the request (for example, food planning).
   */
  onSubmit?: (input: string, previousMessages: Message[]) => Promise<string>;
  /** Lets a feature own the conversation state while reusing this chat's UI and composer. */
  controlledMessages?: Message[];
  onInput?: (input: string, previousMessages: Message[]) => Promise<void>;
  recordingRequestId?: number;
  /** Hide the default recorder when a screen presents tap-only choices. */
  showVoiceControl?: boolean;
  placeholder?: string;
  renderBelowMessages?: () => React.ReactNode;
};

export const Chat = ({
  onMealRetrieval,
  onSubmit,
  controlledMessages,
  onInput,
  recordingRequestId,
  showVoiceControl = true,
  placeholder = "Type to AI...",
  renderBelowMessages,
}: ChatProps) => {
  const theme = useAppTheme();
  const { logMode, initialTranscript } = useLocalSearchParams<{
    logMode?: string;
    initialTranscript?: string;
  }>();
  const foodMeals = useSelector((state: RootState) => state.food.meals);
  const recipes = foodMeals.filter(
    (meal: Meal) => meal?.isAdded && meal?.recipe
  );
  const replacements = useSelector(
    (state: RootState) => state.userData.replacements ?? []
  );
  const memory: UserMemory = useSelector((state: RootState) => ({
    likes: state.userData.likes ?? [],
    dislikes: state.userData.dislikes ?? [],
    preferences: state.userData.preferences ?? [],
  }));
  const loggingSessionMessages = useSelector(
    (state: RootState) => state.loggingSession?.messages ?? []
  );
  const pendingMealDrafts = useSelector(
    (state: RootState) => state.loggingSession?.pendingMeals ?? []
  );
  const pendingMeals = React.useMemo(
    () =>
      pendingMealDrafts.map(
        (draft) => foodMeals.find((meal) => meal.mealId === draft.mealId) ?? draft
      ),
    [foodMeals, pendingMealDrafts]
  );
  const approvedMeals = useSelector(
    (state: RootState) => state.loggingSession?.approvedMeals ?? []
  );
  const [messages, setMessages] = React.useState<Message[]>(
    onInput || onSubmit ? [] : loggingSessionMessages
  );
  const messagesRef = React.useRef<Message[]>([]);
  const {
    isRecording,
    isBusy: audioPending,
    startRecording,
    stopRecording,
    discardRecording,
  } = useVoiceRecorder();
  const dispatch = useDispatch();

  const scrollViewRef = React.useRef<ScrollView>(null);
  const inputRef = React.useRef<TextInput>(null);
  const processedInitialTranscript = React.useRef(false);

  React.useEffect(() => {
    // Scroll to the bottom when new messages are added
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [controlledMessages ?? messages]);

  // useAudioRecorder releases the native recorder when the screen unmounts.

  React.useEffect(() => {
    messagesRef.current = controlledMessages ?? messages;
  }, [controlledMessages, messages]);

  const startLogging = async () => {
    const result = await startRecording();
    if (result === "started") {
      setMessages((previous) =>
        previous.concat({ from: MessageFrom.USER, contents: "..." })
      );
    } else if (result === "permission-denied") {
      Alert.alert("Microphone access needed", "Allow microphone access in Settings, or type your meal below.");
    } else {
      Alert.alert("Couldn't start recording", "Please try again or type your meal.");
    }
  };

  const lastRecordingRequestId = React.useRef(0);
  React.useEffect(() => {
    if (
      !recordingRequestId ||
      recordingRequestId === lastRecordingRequestId.current
    ) {
      return;
    }
    lastRecordingRequestId.current = recordingRequestId;
    void startLogging();
  }, [recordingRequestId]);

  const stopLogging = async () => {
    try {
      const uri = await stopRecording();
      if (!uri) throw new Error("Recording has no URI");

      const transcription = await transcribeAudio(uri);
      if (transcription) {
        await attemptParseMeal(transcription);
      } else {
        setMessages((previous) =>
          previous.slice(0, -1).concat({
            from: MessageFrom.GPT,
            contents:
              "I couldn't transcribe that recording. Check the Metro log for the OpenAI error.",
          })
        );
      }
    } catch {
      Alert.alert("Couldn't finish recording", "Please try again or type your meal.");
    }
  };

  const cancelLogging = async () => {
    await discardRecording();
    setMessages((previous) =>
      previous[previous.length - 1]?.contents === "..."
        ? previous.slice(0, -1)
        : previous
    );
    inputRef.current?.focus();
  };

  const approveMeal = (approvedMeal: Meal) => {
    dispatch(logMeal(approvedMeal.mealId));
    dispatch(approvePendingMeal(approvedMeal));
    if (pendingMeals.length === 1) {
      dispatch(clearLoggingSession());
      router.back();
    }
  };

  const removeMealFromSession = (removedMeal: Meal) => {
    dispatch(removeMeal(removedMeal.mealId));
    dispatch(removePendingMeal(removedMeal.mealId));
  };

  const attemptParseMeal = async (
    transcription: string,
    voiceOrigin = true
  ) => {
    if (transcription) {
      if (onInput) {
        try {
          await onInput(transcription, messagesRef.current);
        } catch {
          // Controlled callers own their visible error state.
        }
        return;
      }

      if (voiceOrigin) {
        setMessages((previous) => {
          return previous
            .slice(0, -1)
            .concat({ from: MessageFrom.USER, contents: transcription })
            .concat({ from: MessageFrom.GPT, contents: "..." });
        });
      } else {
        inputRef.current?.clear();
        setMessages((previous) => {
          return previous
            .concat({ from: MessageFrom.USER, contents: transcription })
            .concat({ from: MessageFrom.GPT, contents: "..." });
        });
      }

      if (onSubmit) {
        try {
          const response = await onSubmit(transcription, messagesRef.current);
          setMessages((previous) =>
            previous.slice(0, -1).concat({
              from: MessageFrom.GPT,
              contents: response,
            })
          );
        } catch {
          setMessages((previous) =>
            previous.slice(0, -1).concat({
              from: MessageFrom.GPT,
              contents: "I couldn't work that out. Please try again.",
            })
          );
        }
        return;
      }

      const attemptUseRecipe =
        recipes.length > 0
          ? await utilizeRecipes(
              transcription,
              messagesRef.current ?? [],
              recipes,
              replacements,
              memory
            )
          : { transformedInput: transcription };

      if (attemptUseRecipe.error) {
        console.error("Recipe matching failed:", attemptUseRecipe.error);
        setMessages((previous) =>
          previous.slice(0, -1).concat({
            from: MessageFrom.GPT,
            contents: `OpenAI request failed: ${attemptUseRecipe.error}`,
          })
        );
        return;
      }

      if (attemptUseRecipe.followUpQuestion) {
        const assistantMessage = {
          from: MessageFrom.GPT,
          contents: attemptUseRecipe.followUpQuestion,
        };
        dispatch(
          appendLoggingMessages([
            { from: MessageFrom.USER, contents: transcription },
            assistantMessage,
          ])
        );
        setMessages((previous) =>
          previous.slice(0, -1).concat(assistantMessage)
        );
      } else if (attemptUseRecipe.transformedInput) {
        let proposedMeals: Meal[] = [];
        let followUpQuestion: string | undefined;
        let learnedPreferences: string[] | undefined;
        let parsingError: string | undefined;

        if (logMode === "recipe") {
          const response = await parseMealRecipe(
            attemptUseRecipe.transformedInput,
            messagesRef.current ?? []
          );
          if ("error" in response) parsingError = response.error;
          else if (response.meal) proposedMeals = [response];
          else followUpQuestion = response.followUpQuestion;
        } else {
          const response = await parseMealSession(
            attemptUseRecipe.transformedInput,
            messagesRef.current ?? [],
            pendingMeals,
            approvedMeals,
            recipes,
            replacements,
            memory,
            { allowLearnedPreferences: true }
          );
          if ("error" in response) parsingError = response.error;
          else {
            proposedMeals = response.meals;
            followUpQuestion = response.followUpQuestion;
            learnedPreferences = response.learnedPreferences;
          }
        }

        if (parsingError) {
          console.error("Meal parsing failed:", parsingError);
          setMessages((previous) =>
            previous.slice(0, -1).concat({
              from: MessageFrom.GPT,
              contents: `OpenAI request failed: ${parsingError}`,
            })
          );
          return;
        }

        if (followUpQuestion) {
          const assistantMessage = {
            from: MessageFrom.GPT,
            contents: followUpQuestion,
          };
          dispatch(
            appendLoggingMessages([
              { from: MessageFrom.USER, contents: transcription },
              assistantMessage,
            ])
          );
          setMessages((previous) =>
            previous.slice(0, -1).concat(assistantMessage)
          );
          return;
        }

        pendingMeals.forEach((pending) => dispatch(removeMeal(pending.mealId)));
        proposedMeals.forEach((proposed) => dispatch(recordMeal(proposed)));
        dispatch(replacePendingMeals(proposedMeals));
        if (learnedPreferences?.length) {
          dispatch(addPreferences(learnedPreferences));
        }
        const assistantMessage = {
          from: MessageFrom.GPT,
          contents:
            proposedMeals.length === 1
              ? proposedMeals[0].motivation
              : `I’ve prepared ${proposedMeals.length} meals for review. You can edit or approve them one at a time.`,
        };
        dispatch(
          appendLoggingMessages([
            { from: MessageFrom.USER, contents: transcription },
            assistantMessage,
          ])
        );
        setMessages((previous) =>
          previous.slice(0, -1).concat(assistantMessage)
        );
      }
    }
  };

  React.useEffect(() => {
    if (
      !initialTranscript ||
      processedInitialTranscript.current ||
      loggingSessionMessages.length > 0
    ) {
      return;
    }
    processedInitialTranscript.current = true;
    void attemptParseMeal(initialTranscript, false);
  }, [initialTranscript, loggingSessionMessages.length]);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={90}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView ref={scrollViewRef}>
        <View>
          {(controlledMessages ?? messages).map((message, index) => (
            <Message
              from={message.from}
              content={message.contents}
              meal={message.meal}
              key={index}
            />
          ))}
          {!onInput && !onSubmit && pendingMeals.map((pendingMeal) => (
            <Message
              key={pendingMeal.mealId}
              from={MessageFrom.GPT}
              content={pendingMeal.motivation}
              meal={pendingMeal}
              onApproveMeal={approveMeal}
              onRemoveMeal={removeMealFromSession}
            />
          ))}
          {renderBelowMessages?.()}
        </View>
      </ScrollView>
      <View style={styles.chatRow}>
        {isRecording && (
          <TouchableOpacity
            disabled={audioPending}
            accessibilityLabel="Cancel recording and type instead"
            onPress={cancelLogging}
            style={styles.cancelRecordingButton}
          >
            <Ionicons name="keypad-outline" size={28} color={theme.text} />
          </TouchableOpacity>
        )}
        {(showVoiceControl || isRecording) && (
          <View style={styles.speakButton}>
            <TouchableOpacity
              disabled={audioPending}
              accessibilityLabel={isRecording ? "Stop recording" : "Record meal"}
              onPress={() => {
                isRecording ? stopLogging() : startLogging();
              }}
            >
              <SpeakSVG
                width={35}
                height={35}
                color={isRecording ? theme.recording : theme.accent}
              />
            </TouchableOpacity>
          </View>
        )}
        <TextInput
          style={[styles.input, { borderColor: theme.accent, color: theme.text }]}
          placeholder={placeholder}
          returnKeyType="send"
          blurOnSubmit
          ref={inputRef}
          multiline
          numberOfLines={5}
          onSubmitEditing={(event) => {
            attemptParseMeal(event.nativeEvent.text, false);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    padding: 8,
    paddingBottom: 24,
  },
  messages: {
    flexDirection: "column-reverse",
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingBottom: 48,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    maxHeight: 100,
    fontSize: 18,
    justifyContent: "center",
  },
  cancelRecordingButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  speakButton: {},
});
