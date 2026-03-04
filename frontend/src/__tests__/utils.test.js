import { getChangedFields } from "../utils/utils";

describe("getChangedFields", () => {
  it("should return an empty object when no fields change", () => {
    const initial = { name: "John", age: 30 };
    const current = { name: "John", age: 30 };
    expect(getChangedFields(initial, current)).toEqual({});
  });

  it("should return changed fields", () => {
    const initial = { name: "John", age: 30, role: "USER" };
    const current = { name: "Jane", age: 30, role: "ADMIN" };
    expect(getChangedFields(initial, current)).toEqual({
      name: "Jane",
      role: "ADMIN",
    });
  });
});
