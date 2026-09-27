import reducer, {
  addDislike,
  addLike,
  addPreferences,
  removePreference,
} from "../userDataSlice";

describe("user memory", () => {
  it("deduplicates signals and keeps likes and dislikes mutually exclusive", () => {
    let state = reducer(undefined, addLike("  Bowls  "));
    state = reducer(state, addLike("bowls"));
    state = reducer(state, addDislike("BOWLS"));

    expect(state.likes).toEqual([]);
    expect(state.dislikes).toEqual(["BOWLS"]);
  });

  it("accepts learned preferences in batches and allows forgetting them", () => {
    let state = reducer(undefined, addPreferences(["Logged coffee often", "logged coffee often"]));
    expect(state.preferences).toEqual(["Logged coffee often"]);

    state = reducer(state, removePreference("LOGGED COFFEE OFTEN"));
    expect(state.preferences).toEqual([]);
  });
});
