import { createSource } from "../../AsyncState";
import {expect} from "@jest/globals";

describe("instance deps", () => {
  // test to shape the API of dependencies and how it should work
  // dependencies are state instances that we will replay when the state changes
  // the API would to allow deps gathering from
  // - source creation via createSource
  // - subscriptions via useAsync and useData

  // The challenges:
  // - some deps may be present from source and hooks, we should run them once
  // - some deps may not be present at the moment of declaration, until invocation

  // Open questions:
  // - should we replay only, or support run too run via args (types!!)
  // - should we always run or only when there is an active subscription

  // Needed features:
  // - run or not based on state and status
  // - integrate with all existing features seamlessly
  // - declare deps by: key or source
  // - provide array of deps
  it.skip("should automatically replay when state changes", () => {
    let main = createSource<number>("main-1", null);
    let spy = jest.fn().mockImplementation(({args}) => args[0]);
    let dep1 = createSource<number, [number]>("dep-1", spy);
    dep1.run(15);

    expect(dep1.getState().data).toBe(15);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].args).toEqual([15]);
    spy.mockClear();

    main.setData(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].args).toEqual([15]);
  });
  it.skip("not run when condition is falsy", () => {

  });
});
