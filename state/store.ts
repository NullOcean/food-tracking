import { configureStore, combineReducers } from "@reduxjs/toolkit";
import foodSlice from "./foodSlice";
import {
  defaultFocusedMetrics,
  defaultGoalCalculationInputs,
  resetDefaultUserGoals,
} from "./userDataSlice";
import userDataSlice from "./userDataSlice";
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
};

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  version: 5,
  whitelist: ["userData", "food"],
  migrate: createMigrate(migrations, { debug: false }),
};

const persistedReducer = persistReducer(
  persistConfig,
  combineReducers({
    userData: userDataSlice,
    food: foodSlice,
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
