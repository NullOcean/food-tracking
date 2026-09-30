import { DisplayedMacros } from "@/types/openAi.types";

export function getRemainingMacros(
  goals: DisplayedMacros,
  consumed: DisplayedMacros
): DisplayedMacros {
  return {
    calories: goals.calories - consumed.calories,
    carbohydrate: goals.carbohydrate - consumed.carbohydrate,
    fiber: goals.fiber - consumed.fiber,
    net_carbohydrates: goals.net_carbohydrates - consumed.net_carbohydrates,
    protein: goals.protein - consumed.protein,
    fat: goals.fat - consumed.fat,
    sugar: goals.sugar - consumed.sugar,
    added_sugars: goals.added_sugars - consumed.added_sugars,
  };
}
