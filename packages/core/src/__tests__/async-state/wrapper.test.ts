import { run } from "../../wrapper";
import { ProducerProps } from "../../types";
import { beforeEach } from "@jest/globals";

describe("wrapper", () => {
  let testProducerProps = { onAbort: () => {} } as ProducerProps<any, any, any>;
  let testIndicators = {
    aborted: false,
    cleared: false,
    done: false,
    index: 0,
  };
  let onSettled = jest.fn();

  beforeEach(() => {
    onSettled.mockClear();
  });

  it("should wrap sync producers and dont return an abort fn", () => {
    let abort = run(
      () => 5,
      testProducerProps,
      testIndicators,
      onSettled,
      undefined, // retry config
      undefined // callbacks
    );

    expect(abort).toBe(undefined);
    expect(onSettled).toHaveBeenCalledWith(
      5,
      "success",
      { args: undefined, payload: undefined },
      undefined
    );
  });
  it("should do nothing when aborted is true immediately after execution", () => {
    let abort = run(
      () => 5,
      testProducerProps,
      { ...testIndicators, aborted: true },
      onSettled,
      undefined, // retry config
      undefined // callbacks
    );

    expect(abort).toBe(undefined);
    expect(onSettled).not.toHaveBeenCalled();
  });
  it("should do nothing when aborted is true immediately after throw in execution", () => {
    let abort = run(
      () => {
        throw 6;
      },
      testProducerProps,
      { ...testIndicators, aborted: true },
      onSettled,
      undefined, // retry config
      undefined // callbacks
    );

    expect(abort).toBe(undefined);
    expect(onSettled).not.toHaveBeenCalled();
  });
});
