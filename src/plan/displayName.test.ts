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

describe("displayName with two people of the same name", () => {
  const people = [{ name: "Alex" }, { name: "  alex " }];

  it("tells them apart by position, ignoring case and spaces", () => {
    expect(displayName(people[0]!, 0, people)).toBe("Alex (Person 1)");
    expect(displayName(people[1]!, 1, people)).toBe("alex (Person 2)");
  });

  it("leaves different names, and unnamed people, as they are", () => {
    const different = [{ name: "Alex" }, { name: "Sam" }];

    expect(displayName(different[0]!, 0, different)).toBe("Alex");
    expect(displayName({}, 1, [{}, {}])).toBe("Person 2");
  });

  it("doesn't change anything when the household isn't passed", () => {
    expect(displayName(people[0]!, 0)).toBe("Alex");
  });
});
