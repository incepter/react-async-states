import * as React from "react";
import { useAsync } from "../../hooks/useAsync_export";
import { createSource } from "async-states";
import { act, fireEvent, render, screen } from "@testing-library/react";

describe("dev warnings", () => {
  let spy = jest.fn();
  let originalConsoleError = console.error;
  beforeAll(() => {
    console.error = spy;
  });
  afterAll(() => {
    spy.mockClear();
    console.error = originalConsoleError;
  });
  afterEach(() => {
    spy.mockClear();
  });
  let source = createSource("test", null);
  it("should output dev warnings with source for irrelevant props", () => {
    function Test1() {
      useAsync({
        source,
        producer: () => 5,
      });
      return null;
    }
    render(
      <React.StrictMode>
        <Test1 />
      </React.StrictMode>
    );
    expect(spy).toHaveBeenCalledWith(
      "[Warning][async-states] Subscription in component Test1 has a " +
        `'source' (${source.key}) and 'producer' as the same time, ` +
        "the source's producer will be replaced."
    );
    spy.mockClear();
    function Test2() {
      useAsync({
        source,
        key: "irrelevant",
      });
      return null;
    }
    render(
      <React.StrictMode>
        <Test2 />
      </React.StrictMode>
    );
    expect(spy).toHaveBeenCalledWith(
      "[Warning][async-states] Subscription in component Test2 has a " +
        "'source' and 'key' as the same time, 'key' has no effect."
    );
  });
  it("should output dev warnings with source for props better declared with it", () => {
    function Test1() {
      useAsync({
        source,
        initialValue: 5,
        runEffect: "debounce",
        hideFromDevtools: true,
        skipPendingStatus: true,
        skipPendingDelayMs: 300,
        runEffectDurationMs: 300,
        resetStateOnDispose: true,
        retryConfig: { enabled: true },
        cacheConfig: { enabled: true },
      });
      return null;
    }
    render(
      <React.StrictMode>
        <Test1 />
      </React.StrictMode>
    );
    expect(spy).toHaveBeenCalledWith(
      "[Warning][async-states] Subscription in component Test1 has a 'source' " +
        "and the following properties 'initialValue, runEffect, " +
        "hideFromDevtools, skipPendingStatus, skipPendingDelayMs, " +
        "runEffectDurationMs, resetStateOnDispose, retryConfig, cacheConfig' " +
        "at the same time. All these props will be flushed into the source " +
        "config, better move them to the source creation."
    );
  });
});
