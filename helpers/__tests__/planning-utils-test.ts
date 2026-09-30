import {
  getRemainingMacros,
} from "@/helpers/planning-utils";

describe("planning utilities", () => {
  it("calculates what remains after today's meals", () => {
    expect(
      getRemainingMacros(
        {
          calories: 1900,
          carbohydrate: 200,
          fiber: 30,
          net_carbohydrates: 170,
          protein: 150,
          fat: 65,
          sugar: 50,
          added_sugars: 50,
        },
        {
          calories: 1050,
          carbohydrate: 110,
          fiber: 15,
          net_carbohydrates: 95,
          protein: 85,
          fat: 35,
          sugar: 20,
          added_sugars: 8,
        }
      )
    ).toMatchObject({ calories: 850, protein: 65, net_carbohydrates: 75 });
  });

});
