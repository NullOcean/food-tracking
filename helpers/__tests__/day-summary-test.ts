import {
  DAY_SUMMARY_MAX_AGE_MS,
  createDaySummarySignature,
  shouldRefreshDaySummary,
} from "@/helpers/day-summary";

const goals = {
  calories: 1900,
  carbohydrate: 200,
  fiber: 30,
  net_carbohydrates: 170,
  protein: 150,
  fat: 65,
  sugar: 50,
  added_sugars: 50,
};

describe("day summary cache", () => {
  it("always refreshes when there is no cached summary", () => {
    const signature = createDaySummarySignature("2026919", goals, goals);
    expect(shouldRefreshDaySummary(null, "2026919", signature)).toBe(true);
  });

  it("refreshes when nutrition inputs change or the cache is stale", () => {
    const signature = createDaySummarySignature("2026919", goals, {
      ...goals,
      calories: 800,
    });
    const summary = {
      date: "2026919",
      content: "On track.",
      inputSignature: signature,
      generatedAt: 1000,
    };

    expect(shouldRefreshDaySummary(summary, "2026919", signature, 1001)).toBe(false);
    expect(
      shouldRefreshDaySummary(summary, "2026919", signature, 1000 + DAY_SUMMARY_MAX_AGE_MS)
    ).toBe(true);
    expect(shouldRefreshDaySummary(summary, "2026919", "changed", 1001)).toBe(true);
  });
});
