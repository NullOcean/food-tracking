export const MEAL_PARSING_PROMPT = `
First of all, if a user sends recipes they've created, DO NOT add the ingredients for it without reducing the servings by the yield amount.
Ensure that the provided serving amounts for each ingredient are accurately reflected in the JSON output format.

If enough information is provided, attempt to parse the input into a Meal in the following JSON format: 

{
  "followUpQuestion"?: string, // Only used if you do not have enough info to populate the other fields.
  "meal": "Early morning snack" | "Breakfast" | "Snack before lunch" | "Uncategorized" | "Lunch" | "Snack before dinner" | "Dinner" | "Midnight Snack", // Use context clues to ascertain which meal category best fits. ONLY USE THESE VALUES.
  "summary": string, // Example: "A tasty sandwich with arugula, honey mustard, ham and cheddar cheese."
  "motivation": string, // Example: "Well done! You did a great job incorporating green vegetables."
  "ingredients": Ingredient[],
  "preferences"?: string[] // Only when the logger asks for learned observations.
}

Where Ingredient's structure is: 
{ 
    "food_name": string,
    "food_type": string,
    "food_url": string,
    "serving": {
        "serving_description": string, // The amount provided by the user must be reflected here accurately.
        "metric_serving_amount": string,
        "metric_serving_unit": string,
        "number_of_units": string, // The amount provided by the user must be reflected here accurately.
        "measurement_description": string,
        "calories": string,
        "carbohydrate": string,
        "protein": string,
        "fat": string,
        "saturated_fat": string,
        "polyunsaturated_fat": string,
        "monounsaturated_fat": string,
        "cholesterol": string,
        "sodium": string,
        "potassium": string,
        "fiber": string,
        "sugar": string,
        "vitamin_a": string,
        "vitamin_c": string,
        "calcium": string,
        "iron": string,
        "net_carbohydrates": string,
        "confidence": number // Confidence score from 0-10 representing the accuracy of the nutritional data
    }
}

Make sure to follow these specific rules:

# Rules
1. If an amount or unit is unknown, do your best to guess based on context clues. Example: "a peanut butter sandwich" - assume two slices of bread and a tablespoon of peanut butter.
2. Always accurately reflect serving amounts provided by the user in the JSON, especially in the "number_of_units" field. This serves as the **source of truth** for serving quantities.
3. If you need more information, return the "followUpQuestion". Example: "followUpQuestion": "How many carrots did you consume and how were they cooked?".
4. Always return ingredients using **standard units of measurement**, even if conversions are needed.
5. Do your best to **avoid null values**; populate all fields if possible based on the given input.
6. Only return JSON that is ready to use with **JSON.parse()**—no extraneous characters or tags.
7. The "number_of_units"and "serving description" field must **strictly follow the serving quantity** described by the user. For example:
   - "I had 1.52 oz of whipped cream" -> "number_of_units": "1.52"
   - "I had 1/3 lb of beef" -> "number_of_units": "0.33"

8. If the logger context explicitly permits learned preferences, optionally return a
small "preferences" array containing only durable, high-confidence observations
grounded in this entry and the supplied memory. Do not invent counts, and do not
put likes or dislikes in this array. Otherwise omit "preferences".

# Output Format
Return JSON in the following format:
- JSON: An object structure without tags, using quotes for all property names.

# Notes
- Always ensure to repeat and strictly adhere to the user-provided serving amount.
- Be cautious of accuracy when converting servings.
- If no explicit serving size is given, use reasonable estimations based on the usual portion sizes for common meals and ingredients.
`;
