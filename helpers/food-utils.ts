import { FoodDetailedResponse } from "@/types/fatSecret.types";
import {
  DisplayedMacros,
  DisplayedMacroTypes,
  Ingredient,
  Meal,
  Serving,
} from "@/types/openAi.types";

const displayedMacroKeys: DisplayedMacroTypes[] = [
  DisplayedMacroTypes.calories,
  DisplayedMacroTypes.carbohydrate,
  DisplayedMacroTypes.fiber,
  DisplayedMacroTypes.net_carbohydrates,
  DisplayedMacroTypes.protein,
  DisplayedMacroTypes.fat,
  DisplayedMacroTypes.sugar,
  DisplayedMacroTypes.added_sugars,
];

export const getSummedMacros = (meals: Meal[]) => {
  let totals: DisplayedMacros = {
    calories: 0,
    carbohydrate: 0,
    fiber: 0,
    net_carbohydrates: 0,
    protein: 0,
    fat: 0,
    sugar: 0,
    added_sugars: 0,
  };

  for (let key of displayedMacroKeys) {
    for (let meal of meals) {
      for (let ingredient of meal.ingredients) {
        totals[key] += parseFloat(String(ingredient.serving[key] ?? 0));
      }
    }
  }
  for (let key of displayedMacroKeys) {
    totals[key] = Math.round(totals[key]);
  }
  return totals;
};

export const getRecipeSummedMacros = (meal: Meal) => {
  let totals: DisplayedMacros = {
    calories: 0,
    carbohydrate: 0,
    fiber: 0,
    net_carbohydrates: 0,
    protein: 0,
    fat: 0,
    sugar: 0,
    added_sugars: 0,
  };

  const yields = meal.recipe?.yields ?? 1;

  for (let key of displayedMacroKeys) {
    for (let ingredient of meal.ingredients) {
      totals[key] += parseFloat(String(ingredient.serving[key] ?? 0)) / yields;
    }
  }
  for (let key of displayedMacroKeys) {
    totals[key] = Math.round(totals[key]);
  }
  return totals;
};

export const sortMealsByLoggedAt = (meals: Meal[]) => {
  return meals
    .map((meal, index) => ({ meal, index }))
    .sort((first, second) => {
      const loggedAtDifference =
        (second.meal.loggedAt ?? 0) - (first.meal.loggedAt ?? 0);
      return loggedAtDifference || second.index - first.index;
    })
    .map(({ meal }) => meal);
};

export const convertFatSecretFood = (
  food: FoodDetailedResponse
): Ingredient => {
  return {
    food_name: food.food.food_name,
    food_type: food.food.food_type,
    food_url: food.food.food_url,
    serving: {
      ...food.food.servings.serving[0],
      confidence: 10,
      net_carbohydrates: (
        parseInt(food.food.servings.serving[0].carbohydrate) -
        parseInt(food.food.servings.serving[0].fiber)
      ).toString(),
    },
  };
};

export const scaleServing = (serving: Serving, actualAmount: number) => {
  if (!(serving && !Number.isNaN(actualAmount))) return null;

  const baseAmount = parseInt(serving.number_of_units);
  const divisor = baseAmount / actualAmount;
  const res = {
    ...serving,
    serving_description: `${actualAmount.toFixed(2)} ${
      serving.measurement_description
    }`,
    metric_serving_amount: actualAmount.toFixed(3),
    number_of_units: actualAmount.toFixed(3),
    calories: divideString(serving.calories, divisor),
    carbohydrate: divideString(serving.carbohydrate, divisor),
    net_carbohydrates: divideString(
      (parseFloat(serving.carbohydrate) - parseFloat(serving.fiber)).toString(),
      divisor
    ),
    protein: divideString(serving.protein, divisor),
    fat: divideString(serving.fat, divisor),
    saturated_fat: divideString(serving.saturated_fat, divisor),
    polyunsaturated_fat: divideString(serving.polyunsaturated_fat, divisor),
    monounsaturated_fat: divideString(serving.monounsaturated_fat, divisor),
    cholesterol: divideString(serving.cholesterol, divisor),
    sodium: divideString(serving.sodium, divisor),
    potassium: divideString(serving.potassium, divisor),
    fiber: divideString(serving.fiber, divisor),
    sugar: divideString(serving.sugar, divisor),
    added_sugars: serving.added_sugars === undefined
      ? undefined
      : divideString(serving.added_sugars, divisor),
    vitamin_a: divideString(serving.vitamin_a, divisor),
    vitamin_c: divideString(serving.vitamin_c, divisor),
    calcium: divideString(serving.calcium, divisor),
    iron: divideString(serving.iron, divisor),
  };
  return res;
};

const divideString = (str: string, divisor: number) =>
  (parseFloat(str) / divisor).toFixed(2);
