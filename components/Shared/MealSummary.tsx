import { getRecipeSummedMacros, getSummedMacros } from "@/helpers/food-utils";
import { capFirstLetter } from "@/helpers/ui";
import { router } from "expo-router";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Button,
  Alert,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { ProgressBar, ProgressBarStyles } from "./ProgressBar";
import { ThemedText } from "../ThemedText";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/state/store";
import { removeMeal, updateMeal } from "@/state/foodSlice";
import {
  DisplayedMacroConfig,
  DisplayedMacroIterator,
  DisplayedMacroTypes,
  Ingredient,
  Meal,
  Serving,
} from "@/types/openAi.types";
import { Picker } from "@react-native-picker/picker";
import DeleteSVG from "../../svg/delete.svg";
import EditSVG from "../../svg/edit.svg";
import DoneSVG from "../../svg/done.svg";
import AddSVG from "../../svg/add.svg";
import { useAppTheme } from "@/hooks/useAppTheme";
import { ThemedView } from "../ThemedView";
import { defaultFocusedMetrics } from "@/state/userDataSlice";

export type MealSummaryProps = {
  mealId: string;
  allowAdding?: boolean;
  onAdd?: () => void;
  onComplete?: () => void;
  expandedByDefault?: boolean;
  embedded?: boolean;
  preview?: boolean;
};

export type MacroBreakdownProps = { macros: Serving; textStyle?: any };
export const MacroBreakdown = ({ macros, textStyle }: MacroBreakdownProps) => {
  return (
    <View>
      {DisplayedMacroIterator.map((macro, index) => (
        <View key={index}>
          <ProgressBar
            style={ProgressBarStyles.REVERSED}
            macro={macro}
            amount={parseFloat(String(macros[macro] ?? 0))}
            textStyle={textStyle}
          />
        </View>
      ))}
    </View>
  );
};

export default function MealSummary({
  mealId,
  allowAdding,
  onAdd,
  onComplete,
  expandedByDefault = false,
  embedded = false,
  preview = false,
}: MealSummaryProps) {
  const [expanded, setExpanded] = React.useState(expandedByDefault);
  const [editing, setEditing] = React.useState(false);
  const theme = useAppTheme();

  const meal = useSelector((state: RootState) => state.food.meals).find(
    (meal: Meal) => meal.mealId === mealId
  );
  const focusedMetrics = useSelector(
    (state: RootState) => state.userData.focusedMetrics ?? defaultFocusedMetrics
  );

  React.useEffect(() => setExpanded(editing), [editing]);
  React.useEffect(() => setEditing(expanded ? editing : false), [expanded]);

  const [pickerCategory, setPickerCategory] = React.useState(meal?.meal);
  React.useEffect(() => updateMealCategory(), [pickerCategory]);

  const dispatch = useDispatch();

  let recipeServings = [];
  for (let i = 0; i < 1000; i += 0.5) {
    recipeServings.push(i);
  }

  const deleteMeal = () => {
    if (!meal?.mealId) return;
    Alert.alert("Are you sure you want to delete this meal?", "", [
      {
        text: "Cancel",
        onPress: () => {},
        style: "cancel",
      },
      { text: "Delete", onPress: () => dispatch(removeMeal(meal.mealId)) },
    ]);
  };

  const updateMealCategory = () => {
    if (!meal || !pickerCategory) return;
    dispatch(updateMeal({ updatedMeal: { ...meal, meal: pickerCategory } }));
  };

  const updateMealSummary = (text: string) => {
    if (!meal) return;
    dispatch(updateMeal({ updatedMeal: { ...meal, summary: text } }));
  };

  const updateRecipeYields = (value: number) => {
    if (!meal?.recipe) return;
    dispatch(
      updateMeal({
        updatedMeal: {
          ...meal,
          recipe: { title: meal.recipe.title, yields: value },
        },
      })
    );
  };

  const updateRecipeTitle = (value: string) => {
    if (!meal?.recipe) return;
    dispatch(
      updateMeal({
        updatedMeal: {
          ...meal,
          recipe: { title: value, yields: meal.recipe.yields },
        },
      })
    );
  };
  return meal ? (
    <ThemedView
      style={{ ...styles.infoPanel, 
    backgroundColor: theme.surfaceRaised, borderRadius: embedded ? 12 : 12 }}
    >
      <View style={styles.header}>
        {((meal.recipe && !editing) || !meal.recipe) && (
          <ThemedText
            type="subtitle"
            onPress={preview ? undefined : () => setExpanded(!expanded)}
          >
            {capFirstLetter(meal.recipe ? meal.recipe.title : meal.meal)}
          </ThemedText>
        )}
        {meal.recipe && editing && !preview && (
          <TextInput
            placeholder="Name your recipe..."
            style={[styles.titleEdit, { color: theme.text }]}
            onSubmitEditing={(event) =>
              updateRecipeTitle(event.nativeEvent.text)
            }
          >
            {meal.recipe.title}
          </TextInput>
        )}
        <View style={styles.row}>
          {preview && onComplete ? (
            <TouchableOpacity onPress={onComplete} accessibilityLabel="Add meal to today">
              <DoneSVG width={32} height={32} color={theme.success} />
            </TouchableOpacity>
          ) : editing ? (
            <TouchableOpacity
              onPress={() => {
                setEditing(false);
                onComplete?.();
              }}
            >
              <DoneSVG
                width={30}
                height={30}
                color={theme.accent}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setEditing(true);
              }}
            >
              <EditSVG
                width={30}
                height={25}
                color={theme.accent}
              />
            </TouchableOpacity>
          )}

          {!preview && meal.isAdded && (
            <TouchableOpacity onPress={deleteMeal}>
              <DeleteSVG
                width={30}
                height={30}
                color={theme.danger}
              />
            </TouchableOpacity>
          )}

          {!preview && allowAdding && onAdd && (
            <TouchableOpacity onPress={onAdd}>
              <AddSVG width={30} height={30} color={theme.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {editing && !meal.recipe && !preview && (
        <View style={styles.categoryPickerContainer}>
          <TextInput
            value={pickerCategory ?? ""}
            onChangeText={setPickerCategory}
            placeholder="Meal name"
            placeholderTextColor={theme.textMuted}
            style={[styles.titleEdit, { color: theme.text }]}
          />
        </View>
      )}
      <View>
        <View style={styles.macros}>
          {meal.recipe && !editing && (
            <ThemedText type="defaultSemiBold">
              Makes {meal.recipe.yields} servings. Per serving:
            </ThemedText>
          )}
          {meal.recipe && editing && (
            <Picker
              selectedValue={meal.recipe.yields}
              onValueChange={(value) => updateRecipeYields(value)}
              itemStyle={{ color: theme.text }}
            >
              {recipeServings.map((i) => (
                <Picker.Item value={i} label={i + " servings"} />
              ))}
            </Picker>
          )}
          {focusedMetrics.map((macro) => (
            <ProgressBar
              key={macro}
              macro={macro}
              amount={
                meal.recipe
                  ? getRecipeSummedMacros(meal)[macro]
                  : getSummedMacros([meal])[macro]
              }
            />
          ))}
        </View>
      </View>
      {editing && !preview ? (
        <TextInput
          style={[styles.summaryInputBox, { color: theme.text }]}
          value={meal.summary}
          multiline
          onChangeText={(text) => updateMealSummary(text)}
        ></TextInput>
      ) : (
        <ThemedText type="defaultSemiBold" style={{ marginTop: 8 }}>
          {meal.summary}
        </ThemedText>
      )}
      {expanded && !preview && (
        <ScrollView style={styles.ingredientList}>
          {meal.ingredients.map((ingredient: Ingredient, index: number) => (
            <TouchableOpacity
              style={styles.ingredient}
              key={index}
              onPress={() =>
                router.push({
                  pathname: "../(editIngredient)/editIngredient",
                  params: { mealId: mealId, ingredient: index },
                })
              }
            >
              <View style={styles.header}>
                <View style={styles.row}>
                  <ThemedText type="defaultSemiBold">
                    {capFirstLetter(ingredient.food_name)}
                  </ThemedText>
                  <ThemedText type="default">
                    {` ${ingredient.serving.serving_description}`}
                  </ThemedText>
                </View>
                <TouchableOpacity>
                  <DeleteSVG
                    width={30}
                    height={30}
                    color={theme.danger}
                  />
                </TouchableOpacity>
              </View>
              <MacroBreakdown macros={ingredient.serving} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addIngredient}>
            <AddSVG width={65} height={65} color={theme.accent} />
          </TouchableOpacity>
        </ScrollView>
      )}
    </ThemedView>
  ) : (
    <></>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  ingredientList: {
    gap: 12,
    marginTop: 8,
  },
  ingredient: {
    paddingTop: 12,
    paddingLeft: 2,
  },
  column: {
    flexDirection: "column",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  macros: {
    gap: 4,
  },
  infoPanel: {
    borderRadius: 0,
    padding: 12,
  },
  categoryPickerContainer: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
  },
  categoryPicker: { flex: 1 },
  categoryPickerBtn: {},
  summaryInputBox: {
    fontSize: 16,
  },
  titleEdit: {
    fontSize: 22,
  },
  addIngredient: {
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
});
