import axios from "axios";
import { MEAL_PARSING_PROMPT } from "../gpt-prompts/meal-parsing";
const AUTHORIZATION = `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`;
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { Message, MessageFrom } from "@/components/Log/Message";
import { Meal } from "@/types/openAi.types";
import { RECIPE_PARSING_PROMPT } from "@/gpt-prompts/recipe-parsing";
import { RECIPE_UTILIZATION_PROMPT } from "@/gpt-prompts/recipe-utilization";
import { DAY_SUMMARY_PROMPT } from "@/gpt-prompts/day-summary";
import { DisplayedMacros } from "@/types/openAi.types";
import {
  RecommendationLevel,
  SuggestedMeal,
  WizardAnswer,
  WizardResponse,
} from "@/config/planning-wizard";
import { PLANNING_WIZARD_PROMPT } from "@/gpt-prompts/planning-wizard";
import type { FoodReplacement, UserMemory } from "@/state/userDataSlice";

const CHAT_MODEL = "gpt-6-luna";

/**
 * Development diagnostics for every OpenAI request. Deliberately accept only
 * request bodies and response data: never pass or log request headers.
 */
const logOpenAIRequest = (operation: string, body: unknown) => {
  console.info(`[openai:${operation}] request`, body);
};

const logOpenAIResponse = (
  operation: string,
  startedAt: number,
  response: { status?: number; headers?: Record<string, unknown>; data?: unknown }
) => {
  console.info(`\n\n\n[openai:${operation}] response`, {
    durationMs: Date.now() - startedAt,
    status: response.status,
    requestId: response.headers?.["x-request-id"],
    body: response.data,
  });
};

const logOpenAIFailure = (operation: string, startedAt: number, error: unknown) => {
  console.error(`[openai:${operation}] failed`, {
    durationMs: Date.now() - startedAt,
    status: axios.isAxiosError(error) ? error.response?.status : undefined,
    code: axios.isAxiosError(error) ? error.code : undefined,
    message: getOpenAIErrorMessage(error),
    body: axios.isAxiosError(error) ? error.response?.data : undefined,
  });
};

const displayedMacroKeys: (keyof DisplayedMacros)[] = [
  "calories",
  "carbohydrate",
  "fiber",
  "net_carbohydrates",
  "protein",
  "fat",
  "sugar",
];

const hasValidDisplayedMacros = (value: unknown): value is DisplayedMacros =>
  typeof value === "object" &&
  value !== null &&
  displayedMacroKeys.every(
    (key) =>
      typeof (value as Record<string, unknown>)[key] === "number" &&
      Number.isFinite((value as Record<string, number>)[key])
  );

const getOpenAIErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message
    );
  }

  return error instanceof Error ? error.message : String(error);
};

export const transcribeAudio = async (audioUri: string) => {
  const startedAt = Date.now();
  const formData = new FormData();
  formData.append("file", new File(audioUri), "recording.m4a");
  formData.append("model", "whisper-1");
  logOpenAIRequest("transcription", {
    model: "whisper-1",
    audioUri,
  });

  try {
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: AUTHORIZATION,
        },
        body: formData,
      }
    );

    const responseBody = await response.json();
    console.info("[openai:transcription] response", {
      durationMs: Date.now() - startedAt,
      status: response.status,
      body: responseBody,
    });
    if (!response.ok) {
      throw new Error(
        responseBody?.error?.message ??
          `Transcription request failed with status ${response.status}`
      );
    }

    return responseBody.text as string;
  } catch (err) {
    logOpenAIFailure("transcription", startedAt, err);
    console.error("Transcription failed:", getOpenAIErrorMessage(err));
    return null;
  }
};

export const summarizeDay = async ({
  currentTime,
  goals,
  consumed,
}: {
  currentTime: string;
  goals: DisplayedMacros;
  consumed: DisplayedMacros;
}) => {
  const startedAt = Date.now();
  const requestBody = {
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: DAY_SUMMARY_PROMPT },
      {
        role: "user",
        content: JSON.stringify({ currentTime, goals, consumed }),
      },
    ],
    response_format: { type: "json_object" },
  };
  logOpenAIRequest("day-summary", requestBody);
  console.info("[day-summary] request started", {
    currentTime,
    goals,
    consumed,
  });

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestBody,
      {
        headers: {
          Authorization: AUTHORIZATION,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      }
    );
    logOpenAIResponse("day-summary", startedAt, response);
    const content = JSON.parse(response.data.choices[0].message.content) as {
      summary?: string;
    };
    const summary = content.summary?.trim() || null;
    console.info("[day-summary] request completed", {
      durationMs: Date.now() - startedAt,
      status: response.status,
      requestId: response.headers["x-request-id"],
      hasSummary: Boolean(summary),
      summaryLength: summary?.length ?? 0,
    });
    return summary;
  } catch (err) {
    logOpenAIFailure("day-summary", startedAt, err);
    console.error("[day-summary] request failed", {
      durationMs: Date.now() - startedAt,
      status: axios.isAxiosError(err) ? err.response?.status : undefined,
      code: axios.isAxiosError(err) ? err.code : undefined,
      message: getOpenAIErrorMessage(err),
    });
    return null;
  }
};

export const advancePlanningWizard = async (context: {
  currentTime: string;
  mode: "quick" | "balanced" | "deep";
  overallGoal: "weight_loss" | "maintenance" | "weight_gain";
  dailyGoals: DisplayedMacros;
  consumedToday: DisplayedMacros;
  remainingToday: DisplayedMacros;
  answers: WizardAnswer[];
  forceSuggestions: boolean;
  recommendationLevel: RecommendationLevel;
  selectedFormat?: Pick<
    SuggestedMeal,
    "title" | "description" | "planningInput"
  >;
  previousRecommendations: string[];
  memory: UserMemory;
  guardrails: {
    questionBudget: number;
    questionCount: number;
    maxRecommendations: number;
    allowedQuestionCategories: string[];
    questionGuardrails: Record<
      string,
      { purpose: string; minOptions: number; maxOptions: number }
    >;
    mealFormats: string[];
  };
}): Promise<WizardResponse | { error: string }> => {
  const startedAt = Date.now();
  const requestBody = {
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: PLANNING_WIZARD_PROMPT },
      { role: "user", content: JSON.stringify(context) },
    ],
    response_format: { type: "json_object" },
  };
  logOpenAIRequest("planning-wizard", requestBody);
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestBody,
      {
        headers: {
          Authorization: AUTHORIZATION,
          "Content-Type": "application/json",
        },
        timeout: 20_000,
      }
    );
    logOpenAIResponse("planning-wizard", startedAt, response);
    const rawContent = response.data.choices[0].message.content;
    const parsed = JSON.parse(rawContent) as WizardResponse;
    const questionGuardrail =
      parsed.action === "question"
        ? context.guardrails.questionGuardrails[parsed.question?.category]
        : undefined;
    if (
      parsed.action === "question" &&
      !context.forceSuggestions &&
      context.guardrails.questionCount < context.guardrails.questionBudget &&
      context.guardrails.allowedQuestionCategories.includes(parsed.question?.category) &&
      !context.answers.some(
        (answer) => answer.category === parsed.question?.category
      ) &&
      parsed.question?.options?.length &&
      questionGuardrail &&
      parsed.question.options.length >= questionGuardrail.minOptions &&
      parsed.question.options.length <= questionGuardrail.maxOptions &&
      parsed.question.options.every(
        (option) =>
          typeof option.id === "string" &&
          typeof option.label === "string" &&
          option.label.trim().length > 0
      )
    ) {
      return parsed;
    }
    if (
      parsed.action === "recommendations" &&
      parsed.recommendations?.length > 0 &&
      parsed.recommendations.length <= context.guardrails.maxRecommendations &&
      parsed.recommendations.every(
        (recommendation) =>
          typeof recommendation.id === "string" &&
          typeof recommendation.title === "string" &&
          typeof recommendation.description === "string" &&
          typeof recommendation.rationale === "string" &&
          typeof recommendation.planningInput === "string" &&
          hasValidDisplayedMacros(recommendation.estimatedMacros)
      ) &&
      (context.recommendationLevel !== "format" ||
        parsed.recommendations.every((recommendation) =>
          typeof recommendation.title === "string" &&
          context.guardrails.mealFormats.includes(
            recommendation.title.trim()
          )
        ))
    ) {
      return parsed;
    }
    console.warn("[openai:planning-wizard] response rejected", {
      rawContent,
      parsed,
      forceSuggestions: context.forceSuggestions,
      recommendationLevel: context.recommendationLevel,
      recommendationCount:
        parsed.action === "recommendations" ? parsed.recommendations?.length : undefined,
      expectedRecommendationCount: context.guardrails.maxRecommendations,
      allowedMealFormats: context.guardrails.mealFormats,
    });
    return { error: "The planner returned an incomplete response. Please try again." };
  } catch (err) {
    logOpenAIFailure("planning-wizard", startedAt, err);
    return { error: getOpenAIErrorMessage(err) };
  }
};

export type ParsedMeal = Meal & { learnedPreferences?: string[] };
export type ParseMealResponse = Promise<ParsedMeal | { error: string }>;
type ParsedMealResponse = Meal & {
  error?: string;
  preferences?: unknown;
};
export type UtilizeRecipeResponse = Promise<{
  followUpQuestion?: string;
  transformedInput?: string;
  error?: string;
}>;

const replacementInstructions = (replacements: FoodReplacement[]) =>
  replacements.length
    ? `\n\nThe user has saved these personal food replacements. Check them before interpreting the user's words. When the input uses a trigger phrase, treat it as the corresponding food description and preserve any extra quantities or context from the input. Do not use a replacement unless the trigger phrase is actually present.\n${JSON.stringify(replacements)}`
    : "";

const memoryInstructions = (
  memory: UserMemory,
  allowLearnedPreferences: boolean
) => `\n\nUSER MEMORY (treat this as helpful context, not an unquestionable fact):
- likes: ${JSON.stringify(memory.likes)}
- dislikes: ${JSON.stringify(memory.dislikes)}
- learned preferences: ${JSON.stringify(memory.preferences)}
Use likes when they fit the request and avoid dislikes unless the user explicitly asks for them. Do not turn a learned preference into a medical, dietary, or identity claim.${
  allowLearnedPreferences
    ? `\nWhen parsing this logger entry, you may add a small number of durable, high-confidence observations to an optional "preferences" string array. Only include observations grounded in the current entry and the supplied memory; do not invent counts or facts. Do not place likes or dislikes in this array.`
    : ""
}`;

const sanitizeLearnedPreferences = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((preference): preference is string => typeof preference === "string")
        .map((preference) => preference.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .filter(
          (preference, index, preferences) =>
            preferences.findIndex(
              (candidate) => candidate.toLocaleLowerCase() === preference.toLocaleLowerCase()
            ) === index
        )
        .slice(0, 5)
    : [];

export const utilizeRecipes = async (
  input: string,
  pastMessages: Message[],
  recipes: Meal[],
  replacements: FoodReplacement[] = [],
  memory: UserMemory = { likes: [], dislikes: [], preferences: [] }
): UtilizeRecipeResponse => {
  const messages = [
    {
      role: "system",
      content:
        RECIPE_UTILIZATION_PROMPT +
        replacementInstructions(replacements) +
        memoryInstructions(memory, false),
    },
    ...pastMessages.map((message) => {
      return {
        role: message.from === MessageFrom.GPT ? "assistant" : "user",
        content: message.contents,
      };
    }),
    ...recipes.map((recipe) => {
      return {
        role: "user",
        content: `Here's a recipe I've created in case you can use it to parse this meal: ${JSON.stringify(
          recipe
        )}`,
      };
    }),
    {
      role: "user",
      content: input,
    },
  ];
  const startedAt = Date.now();
  const requestBody = {
    model: CHAT_MODEL,
    messages,
    response_format: { type: "json_object" },
  };
  logOpenAIRequest("recipe-utilization", requestBody);

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestBody,
      {
        headers: {
          Authorization: AUTHORIZATION,
          "Content-Type": "application/json",
        },
      }
    );
    logOpenAIResponse("recipe-utilization", startedAt, response);
    try {
      const res = JSON.parse(response.data.choices[0].message.content) as {
        followUpQuestion?: string;
        transformedInput?: string;
      };
      return res;
    } catch (err) {
      return { error: getOpenAIErrorMessage(err) };
    }
  } catch (err) {
    logOpenAIFailure("recipe-utilization", startedAt, err);
    return { error: getOpenAIErrorMessage(err) };
  }
};

export const parseMeal = async (
  input: string,
  pastMessages: Message[],
  recipes: Meal[],
  replacements: FoodReplacement[] = [],
  memory: UserMemory = { likes: [], dislikes: [], preferences: [] },
  options: { allowLearnedPreferences?: boolean } = {}
): ParseMealResponse => {
  const allowLearnedPreferences = options.allowLearnedPreferences ?? false;
  const messages = [
    {
      role: "system",
      content:
        MEAL_PARSING_PROMPT +
        replacementInstructions(replacements) +
        memoryInstructions(memory, allowLearnedPreferences),
    },
    ...pastMessages.map((message) => {
      return {
        role: message.from === MessageFrom.GPT ? "assistant" : "user",
        content: message.contents,
      };
    }),
    ...recipes.map((recipe) => {
      return {
        role: "user",
        content: `Here's a recipe I've created in case you can use it to parse this meal: ${JSON.stringify(
          recipe
        )}`,
      };
    }),
    {
      role: "user",
      content: input,
    },
  ];
  const startedAt = Date.now();
  const requestBody = {
    model: CHAT_MODEL,
    messages,
    response_format: { type: "json_object" },
  };
  logOpenAIRequest("meal-parsing", requestBody);

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestBody,
      {
        headers: {
          Authorization: AUTHORIZATION,
          "Content-Type": "application/json",
        },
      }
    );
    logOpenAIResponse("meal-parsing", startedAt, response);
    const date = new Date();
    try {
      const parsedMeal = JSON.parse(
        response.data.choices[0].message.content
      ) as ParsedMealResponse;
      if (parsedMeal.error) {
        throw new Error("Tried to record an invalid meal");
      }
      const { preferences, ...meal } = parsedMeal;
      return {
        ...meal,
        mealId: Crypto.randomUUID(),
        date: `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`,
        ...(allowLearnedPreferences
          ? { learnedPreferences: sanitizeLearnedPreferences(preferences) }
          : {}),
      };
    } catch (err) {
      return { error: getOpenAIErrorMessage(err) };
    }
  } catch (err) {
    logOpenAIFailure("meal-parsing", startedAt, err);
    return { error: getOpenAIErrorMessage(err) };
  }
};

export const parseMealRecipe = async (
  input: string,
  pastMessages: Message[]
): ParseMealResponse => {
  const messages = [
    {
      role: "system",
      content: RECIPE_PARSING_PROMPT,
    },
    ...pastMessages.map((message) => {
      return {
        role: message.from === MessageFrom.GPT ? "assistant" : "user",
        content: message.contents,
      };
    }),
    {
      role: "user",
      content: input,
    },
  ];
  const startedAt = Date.now();
  const requestBody = {
    model: CHAT_MODEL,
    messages,
    response_format: { type: "json_object" },
  };
  logOpenAIRequest("recipe-parsing", requestBody);

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestBody,
      {
        headers: {
          Authorization: AUTHORIZATION,
          "Content-Type": "application/json",
        },
      }
    );
    logOpenAIResponse("recipe-parsing", startedAt, response);
    const date = new Date();
    try {
      const parsedMeal = JSON.parse(
        response.data.choices[0].message.content
      ) as ParsedMealResponse;
      if (parsedMeal.error) {
        throw new Error("Tried to record an invalid meal");
      }
      const { preferences: _preferences, ...meal } = parsedMeal;
      return {
        ...meal,
        mealId: Crypto.randomUUID(),
        date: `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`,
      };
    } catch (err) {
      return { error: getOpenAIErrorMessage(err) };
    }
  } catch (err) {
    logOpenAIFailure("recipe-parsing", startedAt, err);
    return { error: getOpenAIErrorMessage(err) };
  }
};
