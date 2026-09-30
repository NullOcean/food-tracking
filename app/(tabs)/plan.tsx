import { Chat } from "@/components/Log/Chat";
import { Message, MessageFrom } from "@/components/Log/Message";
import { ThemedText } from "@/components/ThemedText";
import {
  PLANNING_WIZARD_CONFIG,
  PlanningMode,
  RecommendationLevel,
  SuggestedMeal,
  WizardAnswer,
  WizardOption,
  WizardQuestion,
  WizardResponse,
} from "@/config/planning-wizard";
import { getSummedMacros } from "@/helpers/food-utils";
import { getRemainingMacros } from "@/helpers/planning-utils";
import { advancePlanningWizard, parseMeal } from "@/services/open-ai";
import { logMeal, recordMeal } from "@/state/foodSlice";
import { addDislike, addLike } from "@/state/userDataSlice";
import type { UserMemory } from "@/state/userDataSlice";
import { RootState } from "@/state/store";
import { DisplayedMacros, Meal } from "@/types/openAi.types";
import * as Crypto from "expo-crypto";
import React from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "@/constants/Colors";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useDispatch, useSelector } from "react-redux";

type PlannerStage = "entry" | "mode" | "wizard" | "known";
type ActiveWizardContent =
  | { kind: "entry" }
  | { kind: "mode" }
  | { kind: "question"; question: WizardQuestion }
  | {
      kind: "recommendations";
      level: RecommendationLevel;
      recommendations: SuggestedMeal[];
    }
  | undefined;

const dateKey = () => {
  const date = new Date();
  return `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`;
};

const initialMessages: Message[] = [
  { from: MessageFrom.GPT, contents: "Do you already know what you want to eat?" },
];

export default function PlanScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const dispatch = useDispatch();
  const goals = useSelector((state: RootState) => state.userData.goals);
  const overallGoal = useSelector(
    (state: RootState) =>
      state.userData.goalCalculationInputs?.overallGoal ?? "weight_loss"
  );
  const meals = useSelector((state: RootState) => state.food.meals);
  const replacements = useSelector(
    (state: RootState) => state.userData.replacements ?? []
  );
  const memory: UserMemory = useSelector((state: RootState) => ({
    likes: state.userData.likes ?? [],
    dislikes: state.userData.dislikes ?? [],
    preferences: state.userData.preferences ?? [],
  }));
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [stage, setStage] = React.useState<PlannerStage>("entry");
  const [mode, setMode] = React.useState<PlanningMode>();
  const [answers, setAnswers] = React.useState<WizardAnswer[]>([]);
  const [activeContent, setActiveContent] =
    React.useState<ActiveWizardContent>({ kind: "entry" });
  const [previousRecommendations, setPreviousRecommendations] = React.useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = React.useState<
    Pick<SuggestedMeal, "title" | "description" | "planningInput">
  >();
  const [commentaryChoice, setCommentaryChoice] = React.useState<{
    category: WizardQuestion["category"];
    option: string;
  }>();
  const [recordingRequestId, setRecordingRequestId] = React.useState(0);
  const [plannedMeal, setPlannedMeal] = React.useState<Meal>();
  const [recommendationFeedback, setRecommendationFeedback] = React.useState<
    Record<string, "like" | "dislike">
  >({});
  const plannerRequestInFlight = React.useRef(false);
  const plannerSessionId = React.useRef(0);

  const todayMeals = meals.filter(
    (meal) => meal.isAdded && !meal.recipe && meal.date === dateKey()
  );
  const consumed = getSummedMacros(todayMeals);
  const remaining = getRemainingMacros(goals, consumed);
  const plannedMacros = plannedMeal ? getSummedMacros([plannedMeal]) : undefined;
  const remainingAfterPlan = plannedMacros
    ? getRemainingMacros(remaining, plannedMacros)
    : undefined;

  const appendMessages = (...newMessages: Message[]) => {
    setMessages((current) => current.concat(newMessages));
  };
  const replaceLoadingWith = (message: Message) => {
    setMessages((current) => current.slice(0, -1).concat(message));
  };

  const setWizardContent = (
    response: WizardResponse,
    recommendationLevel: RecommendationLevel
  ) => {
    if (response.action === "question") {
      setActiveContent({ kind: "question", question: response.question });
      return;
    }
    setPreviousRecommendations((current) =>
      current.concat(response.recommendations.map((recommendation) => recommendation.title))
    );
    setActiveContent({
      kind: "recommendations",
      level: recommendationLevel,
      recommendations: response.recommendations,
    });
  };

  const requestWizardStep = async (
    nextAnswers: WizardAnswer[],
    selectedMode: PlanningMode,
    forceSuggestions = false,
    recommendationLevel: RecommendationLevel = "format",
    selectedFormat?: Pick<
      SuggestedMeal,
      "title" | "description" | "planningInput"
    >
  ) => {
    if (plannerRequestInFlight.current) return;
    const requestSessionId = plannerSessionId.current;
    plannerRequestInFlight.current = true;
    setStage("wizard");
    setActiveContent(undefined);
    appendMessages({ from: MessageFrom.GPT, contents: "..." });

    try {
      const response = await advancePlanningWizard({
        currentTime: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
        mode: selectedMode,
        overallGoal,
        dailyGoals: goals,
        consumedToday: consumed,
        remainingToday: remaining,
        answers: nextAnswers,
        forceSuggestions,
        recommendationLevel,
        selectedFormat,
        previousRecommendations,
        memory,
        guardrails: {
          questionBudget: PLANNING_WIZARD_CONFIG.modes[selectedMode].questionBudget,
          questionCount: nextAnswers.length,
          maxRecommendations: PLANNING_WIZARD_CONFIG.maxRecommendations,
          allowedQuestionCategories: PLANNING_WIZARD_CONFIG.allowedQuestionCategories,
          questionGuardrails: PLANNING_WIZARD_CONFIG.questionGuardrails,
          mealFormats: PLANNING_WIZARD_CONFIG.mealFormats,
        },
      });
      if (requestSessionId !== plannerSessionId.current) return;
      if ("error" in response) {
        replaceLoadingWith({
          from: MessageFrom.GPT,
          contents: `I couldn't continue the planner: ${response.error}`,
        });
        return;
      }
      replaceLoadingWith({ from: MessageFrom.GPT, contents: response.message });
      setWizardContent(response, recommendationLevel);
    } finally {
      if (requestSessionId === plannerSessionId.current) {
        plannerRequestInFlight.current = false;
      }
    }
  };

  const chooseEntry = (knowsWhatTheyWant: boolean) => {
    appendMessages({
      from: MessageFrom.USER,
      contents: knowsWhatTheyWant
        ? "Yep, I have something in mind"
        : "Not really—help me decide",
    });
    if (knowsWhatTheyWant) {
      setStage("known");
      setActiveContent(undefined);
      appendMessages({
        from: MessageFrom.GPT,
        contents: "Tell me what you're thinking, and I'll show how it fits today.",
      });
      return;
    }
    setStage("mode");
    setActiveContent({ kind: "mode" });
    appendMessages({ from: MessageFrom.GPT, contents: "How much help do you want tonight?" });
  };

  const chooseMode = (selectedMode: PlanningMode) => {
    const selected = PLANNING_WIZARD_CONFIG.modes[selectedMode];
    appendMessages({ from: MessageFrom.USER, contents: selected.label });
    setMode(selectedMode);
    setAnswers([]);
    setSelectedFormat(undefined);
    void requestWizardStep([], selectedMode);
  };

  const chooseWizardOption = (question: WizardQuestion, option: string) => {
    if (!mode) return;
    const nextAnswers = answers.concat({ category: question.category, answer: option });
    setAnswers(nextAnswers);
    appendMessages({ from: MessageFrom.USER, contents: option });
    void requestWizardStep(nextAnswers, mode);
  };

  const forceSuggestions = () => {
    if (!mode) return;
    appendMessages({ from: MessageFrom.USER, contents: "Just give me suggestions" });
    const recommendationLevel =
      activeContent?.kind === "recommendations" ? activeContent.level : "format";
    void requestWizardStep(
      answers,
      mode,
      true,
      recommendationLevel,
      selectedFormat
    );
  };

  const planKnownFood = async (input: string) => {
    if (plannerRequestInFlight.current) return;
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    const requestSessionId = plannerSessionId.current;
    plannerRequestInFlight.current = true;
    setActiveContent(undefined);
    appendMessages(
      { from: MessageFrom.USER, contents: trimmedInput },
      { from: MessageFrom.GPT, contents: "..." }
    );
    try {
      const activePlanContext = plannedMeal
        ? `The current planned food is ${JSON.stringify({ summary: plannedMeal.summary, ingredients: plannedMeal.ingredients })}. Treat any reference to it as a revision. `
        : "";
      const response = await parseMeal(
        `${activePlanContext}This is a food-planning request. Estimate the exact food and quantities described; do not normalize, omit, or invent quantities. Food request: ${trimmedInput}`,
        [],
        meals.filter((meal) => meal.isAdded && meal.recipe),
        replacements,
        memory,
        { allowLearnedPreferences: false }
      );
      if (requestSessionId !== plannerSessionId.current) return;
      if ("error" in response) {
        replaceLoadingWith({ from: MessageFrom.GPT, contents: `I couldn't estimate that: ${response.error}` });
        return;
      }
      const { learnedPreferences: _learnedPreferences, ...plannedMealResponse } = response;
      if (!plannedMealResponse.ingredients.length) {
        replaceLoadingWith({ from: MessageFrom.GPT, contents: "I need a little more detail—try the food or restaurant item." });
        return;
      }
      setPlannedMeal(plannedMealResponse);
      replaceLoadingWith({ from: MessageFrom.GPT, contents: "Cool—here's how that fits today." });
    } finally {
      if (requestSessionId === plannerSessionId.current) {
        plannerRequestInFlight.current = false;
      }
    }
  };

  const chooseFormatRecommendation = (recommendation: SuggestedMeal) => {
    if (!mode) return;
    const selectedSuggestion = {
      title: recommendation.title,
      description: recommendation.description,
      planningInput: recommendation.planningInput,
    };
    setSelectedFormat(selectedSuggestion);
    appendMessages({ from: MessageFrom.USER, contents: recommendation.title });
    void requestWizardStep(
      answers,
      mode,
      true,
      "option",
      selectedSuggestion
    );
  };

  const rateRecommendation = (
    recommendation: SuggestedMeal,
    rating: "like" | "dislike"
  ) => {
    dispatch(
      rating === "like"
        ? addLike(recommendation.title)
        : addDislike(recommendation.title)
    );
    setRecommendationFeedback((current) => ({
      ...current,
      [recommendation.id]: rating,
    }));
  };


  const handleChatInput = async (input: string) => {
    if (stage === "known") return planKnownFood(input);
    if (stage === "entry") {
      if (asksForSuggestions(input)) {
        const defaultMode: PlanningMode = "balanced";
        appendMessages({ from: MessageFrom.USER, contents: input });
        setMode(defaultMode);
        setAnswers([]);
        return requestWizardStep([], defaultMode, true);
      }
      setStage("known");
      setActiveContent(undefined);
      return planKnownFood(input);
    }
    if (stage === "mode" && asksForSuggestions(input)) {
      const defaultMode: PlanningMode = "balanced";
      appendMessages({ from: MessageFrom.USER, contents: input });
      setMode(defaultMode);
      setAnswers([]);
      return requestWizardStep([], defaultMode, true);
    }
    if (stage === "wizard" && mode && activeContent?.kind === "question") {
      const answer =
        commentaryChoice?.category === activeContent.question.category
          ? `${commentaryChoice.option}: ${input}`
          : input;
      const nextAnswers = answers.concat({ category: activeContent.question.category, answer });
      setCommentaryChoice(undefined);
      setAnswers(nextAnswers);
      appendMessages({ from: MessageFrom.USER, contents: answer });
      return requestWizardStep(nextAnswers, mode, asksForSuggestions(input));
    }
    if (stage === "wizard" && mode && activeContent?.kind === "recommendations") {
      const nextAnswers = answers.concat({ category: "adjustment", answer: input });
      setAnswers(nextAnswers);
      appendMessages({ from: MessageFrom.USER, contents: input });
      return requestWizardStep(
        nextAnswers,
        mode,
        true,
        activeContent.level,
        selectedFormat
      );
    }
    appendMessages({
      from: MessageFrom.GPT,
      contents: "Pick an option above, or tell me what you already have in mind.",
    });
  };

  const logPlannedMeal = () => {
    if (!plannedMeal) return;
    const mealToLog = { ...plannedMeal, mealId: Crypto.randomUUID(), isAdded: true };
    dispatch(recordMeal(mealToLog));
    dispatch(logMeal(mealToLog.mealId));
    setPlannedMeal(undefined);
    Alert.alert("Logged", "Added to today's food log.");
  };

  const startOver = () => {
    plannerSessionId.current += 1;
    plannerRequestInFlight.current = false;
    setMessages(initialMessages);
    setStage("entry");
    setMode(undefined);
    setAnswers([]);
    setActiveContent({ kind: "entry" });
    setPreviousRecommendations([]);
    setSelectedFormat(undefined);
    setCommentaryChoice(undefined);
    setPlannedMeal(undefined);
    setRecommendationFeedback({});
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.budgetCard}>
          <BudgetValue label="Calories left" value={remaining.calories} unit="kcal" />
          <BudgetValue label="Protein left" value={remaining.protein} unit="g" />
          <BudgetValue label="Net carbs left" value={remaining.net_carbohydrates} unit="g" />
        </View>
        <Pressable
          style={styles.startOver}
          onPress={startOver}
          accessibilityLabel="Start planning over"
        >
          <ThemedText colorOverride={theme.textMuted}>Start over</ThemedText>
        </Pressable>
      </View>
      <Chat
        controlledMessages={messages}
        onInput={handleChatInput}
        recordingRequestId={recordingRequestId}
        showVoiceControl={
          activeContent?.kind !== "question" ||
          activeContent.question.options.some((option) => option.requiresCommentary)
        }
        placeholder={stage === "known" ? "Tell me what you're considering..." : "Or say something else..."}
        renderBelowMessages={() => (
          <>
            <WizardOptions
              content={activeContent}
              remaining={remaining}
              onChooseEntry={chooseEntry}
              onChooseMode={chooseMode}
              onChooseQuestion={chooseWizardOption}
              onChooseFormatRecommendation={chooseFormatRecommendation}
              recommendationFeedback={recommendationFeedback}
              onRateRecommendation={rateRecommendation}
              onForceSuggestions={forceSuggestions}
              onRequestCommentary={(question, option) => {
                setCommentaryChoice({ category: question.category, option });
                setRecordingRequestId((current) => current + 1);
              }}
            />
            {plannedMeal && plannedMacros && remainingAfterPlan && (
              <PlanImpactCard meal={plannedMeal} macros={plannedMacros} remaining={remaining} remainingAfter={remainingAfterPlan} onLog={logPlannedMeal} />
            )}
          </>
        )}
      />
    </View>
  );
}

function WizardOptions({ content, remaining, onChooseEntry, onChooseMode, onChooseQuestion, onChooseFormatRecommendation, recommendationFeedback, onRateRecommendation, onForceSuggestions, onRequestCommentary }: {
  content: ActiveWizardContent;
  remaining: DisplayedMacros;
  onChooseEntry: (value: boolean) => void;
  onChooseMode: (mode: PlanningMode) => void;
  onChooseQuestion: (question: WizardQuestion, option: string) => void;
  onChooseFormatRecommendation: (recommendation: SuggestedMeal) => void;
  recommendationFeedback: Record<string, "like" | "dislike">;
  onRateRecommendation: (recommendation: SuggestedMeal, rating: "like" | "dislike") => void;
  onForceSuggestions: () => void;
  onRequestCommentary: (question: WizardQuestion, option: string) => void;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  if (!content) return null;
  if (content.kind === "entry") return <OptionGroup options={["Yep, I have something in mind", "Not really—help me decide"]} onChoose={(option) => onChooseEntry(option.startsWith("Yep"))} />;
  if (content.kind === "mode") {
    return <OptionGroup options={(Object.keys(PLANNING_WIZARD_CONFIG.modes) as PlanningMode[]).map((mode) => PLANNING_WIZARD_CONFIG.modes[mode].label)} onChoose={(label) => {
      const mode = (Object.keys(PLANNING_WIZARD_CONFIG.modes) as PlanningMode[]).find((candidate) => PLANNING_WIZARD_CONFIG.modes[candidate].label === label);
      if (mode) onChooseMode(mode);
    }} />;
  }
  if (content.kind === "question") {
    return <View><WizardQuestionOptions options={content.question.options} onChoose={(option) => onChooseQuestion(content.question, option)} onRequestCommentary={(option) => onRequestCommentary(content.question, option)} /><Pressable style={styles.suggestNow} onPress={onForceSuggestions}><ThemedText colorOverride={theme.textMuted}>Just give me suggestions</ThemedText></Pressable></View>;
  }
  return <View style={styles.recommendations}><ThemedText style={styles.recommendationHint}>{content.level === "format" ? "Pick a direction that sounds good." : "A few ways that format could fit today. When you choose a restaurant, log the exact order from Today."}</ThemedText>{content.recommendations.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} remaining={remaining} level={content.level} onPress={content.level === "format" ? () => onChooseFormatRecommendation(recommendation) : undefined} feedback={recommendationFeedback[recommendation.id]} onRate={(rating) => onRateRecommendation(recommendation, rating)} />)}<Pressable style={styles.suggestNow} onPress={onForceSuggestions}><ThemedText colorOverride={theme.textMuted}>Keep suggesting</ThemedText></Pressable></View>;
}

function OptionGroup({ options, onChoose }: { options: string[]; onChoose: (option: string) => void }) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  return <View style={styles.options}>{options.map((option) => <Pressable key={option} style={styles.option} onPress={() => onChoose(option)}><ThemedText colorOverride={theme.text}>{option}</ThemedText></Pressable>)}</View>;
}

function WizardQuestionOptions({ options, onChoose, onRequestCommentary }: { options: WizardOption[]; onChoose: (option: string) => void; onRequestCommentary: (option: string) => void }) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  return <View style={styles.options}>{options.map((option) => <View key={option.id} style={styles.option}><Pressable style={styles.optionMain} onPress={() => onChoose(option.label)}><ThemedText colorOverride={theme.text}>{option.label}</ThemedText></Pressable>{option.requiresCommentary && <Pressable style={styles.optionMic} onPress={() => onRequestCommentary(option.label)} accessibilityLabel={`Add commentary for ${option.label}`}><Ionicons name="mic-outline" size={21} color={theme.accent} /></Pressable>}</View>)}</View>;
}

function RecommendationCard({ recommendation, remaining, level, onPress, feedback, onRate }: { recommendation: SuggestedMeal; remaining: DisplayedMacros; level: RecommendationLevel; onPress?: () => void; feedback?: "like" | "dislike"; onRate: (rating: "like" | "dislike") => void }) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const after = getRemainingMacros(remaining, recommendation.estimatedMacros);
  return <View style={styles.recommendation}><Pressable onPress={onPress} disabled={!onPress}><ThemedText type="defaultSemiBold">{recommendation.title}</ThemedText>{level === "option" && <><ThemedText style={styles.recommendationDescription}>{recommendation.description}</ThemedText><ThemedText style={styles.rationale}>{recommendation.rationale}</ThemedText></>}<ThemedText style={styles.impact}>~{recommendation.estimatedMacros.calories} kcal · {recommendation.estimatedMacros.protein}g protein · {recommendation.estimatedMacros.net_carbohydrates}g net carbs · ~{recommendation.estimatedMacros.added_sugars}g added sugar</ThemedText><ThemedText style={styles.afterImpact}>{formatRemaining(after)}</ThemedText></Pressable><View style={styles.feedbackRow}><ThemedText style={styles.feedbackLabel}>Helpful?</ThemedText><Pressable accessibilityLabel={`Like ${recommendation.title}`} onPress={() => onRate("like")} style={styles.feedbackButton}><Ionicons name={feedback === "like" ? "thumbs-up" : "thumbs-up-outline"} size={20} color={feedback === "like" ? theme.accent : theme.textMuted} /></Pressable><Pressable accessibilityLabel={`Dislike ${recommendation.title}`} onPress={() => onRate("dislike")} style={styles.feedbackButton}><Ionicons name={feedback === "dislike" ? "thumbs-down" : "thumbs-down-outline"} size={20} color={feedback === "dislike" ? theme.danger : theme.textMuted} /></Pressable></View></View>;
}

function PlanImpactCard({ meal, macros, remaining, remainingAfter, onLog }: { meal: Meal; macros: DisplayedMacros; remaining: DisplayedMacros; remainingAfter: DisplayedMacros; onLog: () => void }) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  return <View style={styles.resultCard}><ThemedText type="subtitle">{meal.summary}</ThemedText><ThemedText style={styles.assumption}>Estimated from the exact amount you described.</ThemedText><ThemedText style={styles.fitMessage}>{getFitMessage(remaining.calories, macros.calories)}</ThemedText><View style={styles.macroGrid}><MacroValue label="Calories" value={macros.calories} /><MacroValue label="Protein" value={macros.protein} suffix="g" /><MacroValue label="Carbs" value={macros.carbohydrate} suffix="g" /><MacroValue label="Fat" value={macros.fat} suffix="g" /></View><ThemedText type="defaultSemiBold" style={styles.afterTitle}>After this plan</ThemedText><ThemedText style={styles.afterText}>{formatRemaining(remainingAfter)}</ThemedText><Pressable style={styles.logButton} onPress={onLog}><ThemedText colorOverride={theme.textOnAccent} type="defaultSemiBold">Log this plan</ThemedText></Pressable></View>;
}

function BudgetValue({ label, value, unit }: { label: string; value: number; unit: string }) { const styles = createStyles(useAppTheme()); return <View><ThemedText style={styles.budgetValue}>{Math.round(value)}{unit}</ThemedText><ThemedText style={styles.budgetLabel}>{label}</ThemedText></View>; }
function MacroValue({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) { const styles = createStyles(useAppTheme()); return <View style={styles.macroValue}><ThemedText type="defaultSemiBold">{value}{suffix}</ThemedText><ThemedText style={styles.macroLabel}>{label}</ThemedText></View>; }
function asksForSuggestions(input: string) { return /\b(suggest|ideas|pick for me|surprise me|just choose)\b/i.test(input); }
function getFitMessage(remainingCalories: number, plannedCalories: number) { if (remainingCalories <= 0) return "You are already around today's calorie target. You can still choose this—this just makes the trade-off visible."; if (plannedCalories <= remainingCalories) return "This fits within your remaining calorie target."; return `This is about ${Math.abs(remainingCalories - plannedCalories)} kcal over your remaining calorie target.`; }
function formatRemaining(remaining: DisplayedMacros) { return `${Math.round(remaining.calories)} kcal left · ${Math.round(remaining.protein)}g protein left · ${Math.round(remaining.net_carbohydrates)}g net carbs left · ${Math.round(remaining.added_sugars)}g added sugar left`; }

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background }, header: { paddingHorizontal: 16, paddingTop: 12 }, budgetCard: { flexDirection: "row", justifyContent: "space-between", backgroundColor: theme.surface, borderRadius: 10, padding: 14 }, budgetValue: { fontSize: 20, fontWeight: "700" }, budgetLabel: { color: theme.textSubtle, fontSize: 12, marginTop: 2 }, startOver: { alignSelf: "flex-end", paddingVertical: 10, paddingHorizontal: 4 }, options: { margin: 12, gap: 8 }, option: { backgroundColor: theme.surfaceRaised, borderRadius: 10, flexDirection: "row", alignItems: "center", padding: 8 }, optionMain: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 }, optionMic: { padding: 12 }, suggestNow: { alignItems: "center", paddingVertical: 8 }, recommendations: { margin: 12, gap: 10 }, recommendationHint: { color: theme.textMuted, fontSize: 13 }, recommendation: { backgroundColor: theme.surface, borderRadius: 10, padding: 14 }, recommendationDescription: { color: theme.text, marginTop: 3 }, rationale: { color: theme.textMuted, fontSize: 13, marginTop: 8 }, impact: { color: theme.accent, marginTop: 10 }, afterImpact: { color: theme.textSubtle, fontSize: 13, marginTop: 3 }, feedbackRow: { alignItems: "center", flexDirection: "row", gap: 4, marginTop: 12 }, feedbackLabel: { color: theme.textSubtle, flex: 1, fontSize: 12 }, feedbackButton: { padding: 6 }, resultCard: { margin: 12, backgroundColor: theme.surface, borderRadius: 10, padding: 16 }, assumption: { color: theme.textSubtle, fontSize: 13, marginTop: 5 }, fitMessage: { color: theme.accent, marginTop: 16, lineHeight: 20 }, macroGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider, paddingTop: 12 }, macroValue: { width: "50%", marginBottom: 10 }, macroLabel: { color: theme.textSubtle, fontSize: 13 }, afterTitle: { marginTop: 4 }, afterText: { color: theme.textMuted, marginTop: 4 }, logButton: { backgroundColor: theme.accent, borderRadius: 8, alignItems: "center", marginTop: 20, paddingVertical: 13 },
});
