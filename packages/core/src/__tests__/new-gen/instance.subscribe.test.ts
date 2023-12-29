import { AsyncState } from "../../AsyncState";
import { mockDateNow } from "../utils/setup";
import { Status } from "../../enums";
import { expect } from "@jest/globals";

mockDateNow();
describe("AsyncState instance subscription", () => {
  it("should skip subscription for falsy values", () => {
    let instance = new AsyncState("state-1", null);
    expect(instance.subsIndex).toBe(null);
    // @ts-ignore
    instance.actions.subscribe({});
    expect(instance.subsIndex).toBe(null);
  });
});
