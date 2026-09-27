import {
  FoodDetailedResponse,
  FoodSearchV1Response,
} from "@/types/fatSecret.types";
import { ThemedText } from "../ThemedText";
import { View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import React from "react";
import { Picker } from "@react-native-picker/picker";
import { getFoodById } from "@/services/fatsecret";
import {
  DisplayedMacroIterator,
  Ingredient,
  Serving,
} from "@/types/openAi.types";
import { ProgressBar } from "../Shared/ProgressBar";
import { convertFatSecretFood, scaleServing } from "@/helpers/food-utils";
import { ThemedButton } from "../ThemedButton";
import { ServingPicker } from "./ServingPicker";
import { useAppTheme } from "@/hooks/useAppTheme";

export type FoodSearchResultsProps = {
  searchResults: FoodSearchV1Response;
  onFoodSelected: (food: Ingredient) => void;
};

export const FoodSearchResults = ({
  searchResults,
  onFoodSelected,
}: FoodSearchResultsProps) => {
  const theme = useAppTheme();
  const [expandedIndex, setExpandedIndex] = React.useState(-1);
  const [expandedFoodDetails, setExpandedFoodDetails] =
    React.useState<FoodDetailedResponse>();
  const [selectedUnitIndex, selectUnitIndex] = React.useState(0);
  const [amount, setAmount] = React.useState(0);
  const [servingPreview, setServingPreview] = React.useState<Serving>();

  const expandIndex = async (index: number) => {
    const details = await getFoodById(searchResults.foods.food[index].food_id);
    if (details) {
      setExpandedIndex(index);
      setExpandedFoodDetails(details);
      setAmount(parseFloat(details.food.servings.serving[0].number_of_units));
      calculateServingPreview();
    }
  };

  React.useEffect(() => {
    if (expandedFoodDetails) {
      calculateServingPreview();
    }
  }, [selectedUnitIndex, amount]);

  const calculateServingPreview = () => {
    const serving =
      expandedFoodDetails?.food.servings.serving[selectedUnitIndex];
    if (serving) {
      const preview = scaleServing(serving, amount);
      if (preview) {
        setServingPreview(preview);
      }
    }
  };

  const chooseFood = () => {
    if (!expandedFoodDetails || !servingPreview) return;
    const convertedFood = {
      food_name: expandedFoodDetails.food.food_name,
      food_type: expandedFoodDetails.food.food_type,
      food_url: expandedFoodDetails.food.food_url,
      serving: servingPreview,
    };
    onFoodSelected(convertedFood);
  };

  return (
    <View style={styles.list}>
      {searchResults?.foods?.food?.map((food, index) => (
        <View key={index} style={[styles.resultContainer, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => expandIndex(index)}>
            <ThemedText type="subtitle">{food.brand_name ? `${food.brand_name} - ` : ''}{food.food_name}</ThemedText>
            {index !== expandedIndex && (
              <ThemedText type="default">{food.food_description}</ThemedText>
            )}
          </TouchableOpacity>
          {index === expandedIndex && expandedFoodDetails && (
            <View>
              <ServingPicker
                possibleServings={expandedFoodDetails?.food.servings.serving}
                onAmountChange={(amount: number) => setAmount(amount)}
                onServingIndexChange={(newIndex: number) =>
                  selectUnitIndex(newIndex)
                }
              />
              <View>
                {servingPreview &&
                  DisplayedMacroIterator.map((macro) => (
                    <ProgressBar
                      key={macro}
                      macro={macro}
                      amount={parseFloat(String(servingPreview[macro] ?? 0))}
                    />
                  ))}
              </View>
              <ThemedButton onPress={() => chooseFood()} title="Swap" />
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    flexDirection: "column",
    gap: 6,
  },
  resultContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    width: "100%",
    minHeight: 100,
  },
});
