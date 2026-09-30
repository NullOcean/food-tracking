import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { Ingredient, Meal } from "@/types/openAi.types";

export interface foodState {
  meals: Meal[];
}

const initialState: foodState = {
  meals: [],
};

export const foodSlice = createSlice({
  name: "food",
  initialState,
  reducers: {
    recordMeal: (state, action: PayloadAction<Meal>) => {
      // record just adds the meal to the array so it can be edited
      state.meals = state.meals.concat(action.payload);
    },
    logMeal: (state, action: PayloadAction<string>) => {
      // log meal makes it visible in today
      const mealIndex = state.meals.findIndex(
        (meal) => meal.mealId === action.payload
      );
      if (mealIndex >= 0) {
        state.meals[mealIndex].isAdded = true;
        state.meals[mealIndex].loggedAt = Date.now();
      } else {
        console.error(
          "Failed to find meal with id " + action.payload,
          state.meals
        );
      }
    },
    removeMeal: (state, action: PayloadAction<string>) => {
      state.meals = state.meals.filter(
        (meal) => meal.mealId !== action.payload
      );
    },
    discardUnloggedMeals: (state) => {
      state.meals = state.meals.filter((meal) => meal.isAdded);
    },
    addIngredient: (state, action: PayloadAction<string>) => {
      const mealIndex = state.meals.findIndex(
        (meal) => meal.mealId === action.payload
      );
      const meal = state.meals[mealIndex];
      meal.ingredients.push({
        food_name: "New Ingredient",
        food_type: "",
        food_url: "",
        serving: {
          serving_description: "1 tbsp",
          metric_serving_amount: "14.900",
          metric_serving_unit: "g",
          number_of_units: "1.000",
          measurement_description: "tbsp",
          calories: "0",
          carbohydrate: "0",
          net_carbohydrates: "0",
          protein: "0",
          fat: "0",
          saturated_fat: "0",
          polyunsaturated_fat: "0",
          monounsaturated_fat: "0",
          cholesterol: "0",
          sodium: "0",
          potassium: "0",
          fiber: "0",
          sugar: "0",
          vitamin_a: "0",
          vitamin_c: "0",
          calcium: "0",
          iron: "0",
          confidence: 10,
        },
      });
      state.meals[mealIndex] = meal;
    },
    removeIngredient: (
      state,
      action: PayloadAction<{ mealId: string; ingredientIndex: number }>
    ) => {
      const mealIndex = state.meals.findIndex(
        (meal) => meal.mealId === action.payload.mealId
      );
      const meal = state.meals[mealIndex];
      meal.ingredients.splice(action.payload.ingredientIndex, 1);
      state.meals[mealIndex] = meal;
    },
    updateIngredient: (
      state,
      action: PayloadAction<{
        mealId: string;
        ingredientIndex: number;
        ingredient: Ingredient;
      }>
    ) => {
      const mealIndex = state.meals.findIndex(
        (meal) => meal.mealId === action.payload.mealId
      );
      const meal = state.meals[mealIndex];
      meal.ingredients[action.payload.ingredientIndex] =
        action.payload.ingredient;
      state.meals[mealIndex] = meal;
    },
    updateMeal: (state, action: PayloadAction<{ updatedMeal: Meal }>) => {
      const index = state.meals.findIndex(
        (meal) => meal.mealId === action.payload.updatedMeal.mealId
      );
      if (index > -1) {
        state.meals[index] = action.payload.updatedMeal;
      }
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  recordMeal,
  logMeal,
  removeMeal,
  discardUnloggedMeals,
  addIngredient,
  removeIngredient,
  updateIngredient,
  updateMeal,
} = foodSlice.actions;

export default foodSlice.reducer;
