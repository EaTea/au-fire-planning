import { describe, expect, it } from "vitest";

import { displayName } from "./displayName";

describe("displayName", () => {
  it("uses the name when there is one", () => {
    expect(displayName({ name: "Alex" }, 0)).toBe("Alex");
  });

  it("falls back to Person N by position, counting from 1", () => {
    expect(displayName({}, 0)).toBe("Person 1");
    expect(displayName({}, 1)).toBe("Person 2");
  });

  it("treats an empty or spaces-only name as unnamed, and trims a real one", () => {
    expect(displayName({ name: "" }, 1)).toBe("Person 2");
    expect(displayName({ name: "   " }, 0)).toBe("Person 1");
    expect(displayName({ name: " Sam " }, 1)).toBe("Sam");
  });
});
