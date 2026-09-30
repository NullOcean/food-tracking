export const MEAL_PARSING_PROMPT = `
First of all, if a user sends recipes they've created, DO NOT add the ingredients for it without reducing the servings by the yield amount.
Ensure that the provided serving amounts for each ingredient are accurately reflected in the JSON output format.

If enough information is provided, attempt to parse the input into a Meal in the following JSON format: 

{
  "followUpQuestion"?: string, // Only used if you do not have enough info to populate the other fields.
  "meal": string, // Choose a concise, natural meal name based on the food and context, such as "Breakfast" or "Afternoon latte". Do not restrict names to a fixed list.
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
        "added_sugars": string,
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
   Estimate added sugars separately from total sugar when details allow; use a conservative estimate and lower confidence when uncertain. Do not assume all sugar is added sugar.
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

export const MEAL_SESSION_PARSING_PROMPT = MEAL_PARSING_PROMPT.replace(
  'If enough information is provided, attempt to parse the input into a Meal in the following JSON format:',
  'For this logging session, return the complete current set of unapproved meals in the following JSON format:'
)
  .replace(
    /  "meal": .*\n  "summary": string,.*\n  "motivation": string,.*\n  "ingredients": Ingredient\[],\n/,
    '  "meals": [{ "meal": string, "summary": string, "motivation": string, "ingredients": Ingredient[] }], // Each item is a distinct eating occasion. Give each a concise natural meal name; multiple foods eaten together belong in one meal.\n'
  )
  .replace(
    'Return JSON in the following format:\n- JSON: An object structure without tags, using quotes for all property names.',
    'Return a JSON object with either "followUpQuestion" and the unchanged current "meals" array, or a complete revised "meals" array. Treat the supplied unapproved meals as the current draft: corrections revise them, additions add items, and removals remove items. Split only clearly distinct eating occasions; multiple foods eaten together are one meal with multiple ingredients. Do not include already-approved meals in the returned array. Approved meals are already logged and must not be revised or duplicated; if the user asks to change an approved meal, explain they can edit it from Today. Return valid JSON only.'
  );
