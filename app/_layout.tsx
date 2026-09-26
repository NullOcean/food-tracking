import { persistor, store } from "@/state/store";
import { Redirect, Stack } from "expo-router";
import React from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function RootLayout() {
  const theme = useAppTheme();
  const headerStyle = {
    headerStyle: {
      backgroundColor: theme.surface,
    },
  };

  return (
    <>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTitleStyle: {
                color: theme.text,
              },
            }}
          >
            <Stack.Screen
              name="(auth)/sign-in"
              options={{
                headerShown: false,
                ...headerStyle,
              }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                title: "Back",
                ...headerStyle,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="(log)/log"
              options={{ headerShown: true, title: "Log Food", ...headerStyle }}
            />
            <Stack.Screen
              name="(editIngredient)/editIngredient"
              options={{
                headerShown: true,
                title: "Edit Ingredient",
                ...headerStyle,
              }}
            />
            <Stack.Screen
              name="settings/goals"
              options={{ headerShown: true, title: "Goals", ...headerStyle }}
            />
            <Stack.Screen
              name="settings/recipes"
              options={{ headerShown: true, title: "Recipes", ...headerStyle }}
            />
            <Stack.Screen
              name="settings/focus"
              options={{ headerShown: true, title: "Focus", ...headerStyle }}
            />
            <Stack.Screen
              name="settings/memory"
              options={{ headerShown: true, title: "Memory", ...headerStyle }}
            />
          </Stack>
        </PersistGate>
      </Provider>
    </>
  );
}
