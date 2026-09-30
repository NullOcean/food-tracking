import { configureStore, combineReducers } from "@reduxjs/toolkit";
import foodSlice from "./foodSlice";
import {
  defaultFocusedMetrics,
  defaultGoalCalculationInputs,
  resetDefaultUserGoals,
} from "./userDataSlice";
import userDataSlice from "./userDataSlice";
import loggingSessionSlice from "./loggingSessionSlice";
import { persistStore, persistReducer } from "redux-persist";
import { createMigrate } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

//AsyncStorage.clear();

const migrations = {
  1: (state: any) => ({
    ...state,
    userData: resetDefaultUserGoals(state?.userData),
  }),
  2: (state: any) => ({
    ...state,
    userData: resetDefaultUserGoals(state?.userData),
  }),
  3: (state: any) => ({
    ...state,
    userData: {
      ...state?.userData,
      focusedMetrics: state?.userData?.focusedMetrics ?? defaultFocusedMetrics,
    },
  }),
  4: (state: any) => ({
    ...state,
    userData: {
      ...state?.userData,
      goalCalculationInputs: {
        ...defaultGoalCalculationInputs,
        ...state?.userData?.goalCalculationInputs,
      },
    },
  }),
  5: (state: any) => ({
    ...state,
    userData: {
      ...state?.userData,
      replacements: state?.userData?.replacements ?? [],
    },
  }),
  6: (state: any) => ({
    ...state,
    userData: {
      ...state?.userData,
      likes: state?.userData?.likes ?? [],
      dislikes: state?.userData?.dislikes ?? [],
      preferences: state?.userData?.preferences ?? [],
    },
  }),
  7: (state: any) => ({
    ...state,
    userData: {
      ...state?.userData,
      goals: {
        ...state?.userData?.goals,
        added_sugars: state?.userData?.goals?.added_sugars ?? 50,
      },
    },
  }),
};

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  version: 7,
  whitelist: ["userData", "food"],
  migrate: createMigrate(migrations, { debug: false }),
};

const persistedReducer = persistReducer(
  persistConfig,
  combineReducers({
    userData: userDataSlice,
    food: foodSlice,
    loggingSession: loggingSessionSlice,
  })
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
