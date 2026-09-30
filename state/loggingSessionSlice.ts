import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Message } from "@/components/Log/Message";
import type { Meal } from "@/types/openAi.types";

export interface LoggingSessionState {
  active: boolean;
  messages: Message[];
  pendingMeals: Meal[];
  approvedMeals: Meal[];
}

const initialState: LoggingSessionState = {
  active: false,
  messages: [],
  pendingMeals: [],
  approvedMeals: [],
};

const loggingSessionSlice = createSlice({
  name: "loggingSession",
  initialState,
  reducers: {
    startLoggingSession: (state) => {
      state.active = true;
    },
    appendLoggingMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages.push(...action.payload);
    },
    replacePendingMeals: (state, action: PayloadAction<Meal[]>) => {
      state.pendingMeals = action.payload;
    },
    removePendingMeal: (state, action: PayloadAction<string>) => {
      state.pendingMeals = state.pendingMeals.filter(
        (meal) => meal.mealId !== action.payload
      );
    },
    approvePendingMeal: (state, action: PayloadAction<Meal>) => {
      const meal = state.pendingMeals.find(
        (candidate) => candidate.mealId === action.payload.mealId
      );
      if (meal) state.approvedMeals.push(action.payload);
      state.pendingMeals = state.pendingMeals.filter(
        (candidate) => candidate.mealId !== action.payload.mealId
      );
    },
    clearLoggingSession: (state) => {
      state.active = false;
      state.messages = [];
      state.pendingMeals = [];
      state.approvedMeals = [];
    },
  },
});

export const {
  appendLoggingMessages,
  startLoggingSession,
  replacePendingMeals,
  removePendingMeal,
  approvePendingMeal,
  clearLoggingSession,
} = loggingSessionSlice.actions;

export default loggingSessionSlice.reducer;
