export type FoodBasic = {
  brand_name: string;
  food_description: string;
  food_id: string;
  food_name: string;
  food_type: string;
  food_url: string;
};

export type FoodSearchV1Response = {
  foods: {
    food: FoodBasic[];
  };
  max_results: string;
  page_number: string;
  total_results: string;
};

export type FoodDetailedResponse = {
  food: {
    food_id: string;
    food_name: string;
    food_type: string;
    food_sub_categories: {
      food_sub_category: string[];
    };
    food_url: string;
    food_images: {
      food_image: {
        image_url: string;
        image_type: string;
      }[];
    };
    food_attributes: {
      allergens: {
        allergen: {
          id: string;
          name: string;
          value: string;
        }[];
      };
      preferences: {
        preference: {
          id: string;
          name: string;
          value: string;
        }[];
      };
    };
    servings: {
      serving: {
        serving_id: string;
        serving_description: string;
        serving_url: string;
        metric_serving_amount: string;
        metric_serving_unit: string;
        number_of_units: string;
        measurement_description: string;
        calories: string;
        carbohydrate: string;
        protein: string;
        fat: string;
        saturated_fat: string;
        polyunsaturated_fat: string;
        monounsaturated_fat: string;
        cholesterol: string;
        sodium: string;
        potassium: string;
        fiber: string;
        sugar: string;
        added_sugars?: string;
        vitamin_a: string;
        vitamin_c: string;
        calcium: string;
        iron: string;
      }[];
    };
  };
};
