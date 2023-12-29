import { isSource } from "../../helpers/isSource";

import { createSource } from "../../AsyncState";

describe("isSource", () => {
  it("should return true for real sources", () => {
    let src = createSource("test1");
    expect(isSource(src)).toBe(true);
  });
  it("should return false for bad sources", () => {
    expect(isSource({})).toBe(false);
    expect(isSource(undefined)).toBeFalsy();
  });
});
