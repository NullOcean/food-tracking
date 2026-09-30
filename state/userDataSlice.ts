import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { DisplayedMacros, DisplayedMacroTypes } from "@/types/openAi.types";
import type { DailySummary } from "@/helpers/day-summary";

export interface userDataState {
  goals: DisplayedMacros;
  goalCalculationInputs: GoalCalculationInputs;
  focusedMetrics: DisplayedMacroTypes[];
  dailySummary: DailySummary | null;
  replacements: FoodReplacement[];
  likes: string[];
  dislikes: string[];
  preferences: string[];
}

export interface FoodReplacement {
  id: string;
  trigger: string;
  replacement: string;
}

export type UserMemory = {
  likes: string[];
  dislikes: string[];
  preferences: string[];
};

const MAX_MEMORY_ITEMS = 100;
const MAX_MEMORY_VALUE_LENGTH = 240;

const normalizeMemoryValue = (value: string) =>
  value.trim().replace(/\s+/g, " ").slice(0, MAX_MEMORY_VALUE_LENGTH);

const addUniqueMemoryValue = (values: string[], value: string) => {
  const normalized = normalizeMemoryValue(value);
  if (!normalized) return;
  if (
    values.length < MAX_MEMORY_ITEMS &&
    !values.some((existing) => existing.toLowerCase() === normalized.toLowerCase())
  ) {
    values.push(normalized);
  }
};

const removeMemoryValue = (values: string[], value: string) => {
  const normalized = value.trim().toLowerCase();
  return values.filter((existing) => existing.toLowerCase() !== normalized);
};

// These inputs are intentionally separate from the manually editable goals.
// A future calculator can use them to suggest goals without overwriting a
// user's choices unless they explicitly accept the suggestions.
export type GoalCalculationInputs = {
  overallGoal?: "weight_loss" | "maintenance" | "weight_gain";
  sex?: "male" | "female" | "unspecified";
  heightInches?: number;
  weightLbs?: number;
  targetWeightLbs?: number;
  weeklyWeightChangeLbs?: number;
};

export const defaultUserGoals: DisplayedMacros = {
  calories: 1900,
  carbohydrate: 200,
  fiber: 30,
  net_carbohydrates: 170,
  protein: 150,
  fat: 65,
  sugar: 50,
  added_sugars: 50,
};

export const defaultFocusedMetrics: DisplayedMacroTypes[] = [
  DisplayedMacroTypes.calories,
  DisplayedMacroTypes.protein,
  DisplayedMacroTypes.net_carbohydrates,
];

export const defaultGoalCalculationInputs: GoalCalculationInputs = {
  sex: "unspecified",
  overallGoal: "weight_loss",
};

const initialState: userDataState = {
  goals: defaultUserGoals,
  goalCalculationInputs: defaultGoalCalculationInputs,
  focusedMetrics: defaultFocusedMetrics,
  dailySummary: null,
  replacements: [],
  likes: [],
  dislikes: [],
  preferences: [],
};

export const resetDefaultUserGoals = (state?: Partial<userDataState>) => ({
  ...state,
  goals: defaultUserGoals,
});

export const userDataSlice = createSlice({
  name: "userData",
  initialState,
  reducers: {
    setGoals: (state, action: PayloadAction<Partial<DisplayedMacros>>) => {
      state.goals = {
        ...state.goals,
        ...action.payload,
      };
    },
    setFocusedMetrics: (state, action: PayloadAction<DisplayedMacroTypes[]>) => {
      // A compact summary with no rows is never useful. The UI also enforces
      // this, but keeping the invariant in state makes every caller safe.
      if (action.payload.length > 0) {
        state.focusedMetrics = action.payload;
      }
    },
    setDailySummary: (state, action: PayloadAction<DailySummary>) => {
      state.dailySummary = action.payload;
    },
    addReplacement: (state, action: PayloadAction<FoodReplacement>) => {
      state.replacements.push(action.payload);
    },
    updateReplacement: (state, action: PayloadAction<FoodReplacement>) => {
      const index = state.replacements.findIndex(
        (replacement) => replacement.id === action.payload.id
      );
      if (index !== -1) {
        state.replacements[index] = action.payload;
      }
    },
    removeReplacement: (state, action: PayloadAction<string>) => {
      state.replacements = state.replacements.filter(
        (replacement) => replacement.id !== action.payload
      );
    },
    addLike: (state, action: PayloadAction<string>) => {
      addUniqueMemoryValue(state.likes, action.payload);
      state.dislikes = removeMemoryValue(state.dislikes, action.payload);
    },
    removeLike: (state, action: PayloadAction<string>) => {
      state.likes = removeMemoryValue(state.likes, action.payload);
    },
    addDislike: (state, action: PayloadAction<string>) => {
      addUniqueMemoryValue(state.dislikes, action.payload);
      state.likes = removeMemoryValue(state.likes, action.payload);
    },
    removeDislike: (state, action: PayloadAction<string>) => {
      state.dislikes = removeMemoryValue(state.dislikes, action.payload);
    },
    addPreferences: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach((preference) => {
        addUniqueMemoryValue(state.preferences, preference);
      });
    },
    removePreference: (state, action: PayloadAction<string>) => {
      state.preferences = removeMemoryValue(state.preferences, action.payload);
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setGoals,
  setFocusedMetrics,
  setDailySummary,
  addReplacement,
  updateReplacement,
  removeReplacement,
  addLike,
  removeLike,
  addDislike,
  removeDislike,
  addPreferences,
  removePreference,
} =
  userDataSlice.actions;

export default userDataSlice.reducer;
