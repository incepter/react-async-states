import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import AsyncStateComponent from "../utils/AsyncStateComponent";
import { flushPromises } from "../utils/test-utils";
import { createSource, RunEffect, Status } from "async-states";

describe("should run producer", () => {
  it("should delegate to replace state when no producer", async () => {
    // given
    const counterSource = createSource<number, any, any>("counter", null, {
      initialValue: 0,
    });

    function Test() {
      return (
        <AsyncStateComponent config={counterSource}>
          {({ source, state }) => (
            <div>
              <button
                data-testid="run"
                onClick={() => source.run((old) => old.data + 1)}
              >
                run
              </button>
              <span data-testid="result">{state.data}</span>
            </div>
          )}
        </AsyncStateComponent>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );
    expect(screen.getByTestId("result").innerHTML).toEqual("0");

    // then
    act(() => {
      fireEvent.click(screen.getByTestId("run"));
    });

    expect(screen.getByTestId("result").innerHTML).toEqual("1");
  });

  it("should run with payload after calling mergePayload", async () => {
    // given
    const counterSource = createSource<number, any, any>(
      "counter-2",
      (props) => props.payload.userId as number
    );

    function Component({ run }) {
      const [input, setInput] = React.useState("");

      return (
        <div>
          <input
            data-testid="input"
            onChange={(e) => setInput(e.target.value)}
          />
          <button data-testid="run" onClick={() => run(input)}>
            run
          </button>
        </div>
      );
    }

    function Test() {
      return (
        <AsyncStateComponent
          config={{
            source: counterSource,
            payload: { userId: "abc" },
            lazy: false,
          }}
        >
          {({ state, source }) => {
            // console.log('hahahahaha', state);
            return (
              <div>
                <Component
                  run={(value) => {
                    source.mergePayload({ userId: value });
                    source.run();
                  }}
                />
                <span data-testid="result">{state.data}</span>
              </div>
            );
          }}
        </AsyncStateComponent>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );
    expect(screen.getByTestId("result").innerHTML).toEqual("abc");

    // then
    act(() => {
      fireEvent.change(screen.getByTestId("input"), {
        target: { value: "hello, world!" },
      });
    });

    await act(async () => {
      await flushPromises();
    });

    act(() => {
      fireEvent.click(screen.getByTestId("run"));
    });

    await act(async () => {
      await flushPromises();
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("hello, world!");
  });
  it("should run in throttle mode", async () => {
    // given
    jest.useFakeTimers();
    let globalMeter = 0;
    const throttledSource = createSource<number, any, [number]>(
      "throttled",
      (props) => {
        return new Promise((resolve) => {
          let id = setTimeout(() => resolve(props.args[0]), 100);
          props.onAbort(() => clearTimeout(id));
        });
      },
      { runEffect: "throttle", runEffectDurationMs: 100 }
    );

    function Test() {
      return (
        <AsyncStateComponent config={throttledSource}>
          {({ source: { run }, state }) => (
            <div>
              <button data-testid="run" onClick={() => run(++globalMeter)}>
                run
              </button>
              <span data-testid="status">{state.status}</span>
              <span data-testid="result">{state.data}</span>
            </div>
          )}
        </AsyncStateComponent>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );
    expect(screen.getByTestId("status").innerHTML).toEqual("initial");
    expect(screen.getByTestId("result").innerHTML).toEqual("");

    // then
    act(() => {
      fireEvent.click(screen.getByTestId("run")); // 1
      fireEvent.click(screen.getByTestId("run")); // 2
    });

    expect(screen.getByTestId("status").innerHTML).toEqual("initial"); // fires after 100ms

    await act(async () => {
      await jest.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("status").innerHTML).toEqual("success");
    expect(screen.getByTestId("result").innerHTML).toEqual("1");
  });
  it("should run in debounce mode", async () => {
    // given
    jest.useFakeTimers();
    let globalMeter = 0;
    const debouncedSource = createSource<number, any, number[]>(
      "debounced",
      (props) => {
        return new Promise((resolve) => {
          let id = setTimeout(() => resolve(props.args[0]), 100);
          props.onAbort(() => clearTimeout(id));
        });
      },
      { runEffect: "debounce", runEffectDurationMs: 100 }
    );

    function Test() {
      return (
        <AsyncStateComponent config={debouncedSource}>
          {({ source: { run }, state }) => (
            <div>
              <button data-testid="run" onClick={() => run(++globalMeter)}>
                run
              </button>
              <span data-testid="status">{state.status}</span>
              <span data-testid="result">{state.data}</span>
            </div>
          )}
        </AsyncStateComponent>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );

    // then
    act(() => {
      fireEvent.click(screen.getByTestId("run")); // 1
      fireEvent.click(screen.getByTestId("run")); // 2
      fireEvent.click(screen.getByTestId("run")); // 3
    });

    expect(screen.getByTestId("status").innerHTML).toEqual("initial"); // fires after 100 millis

    await act(async () => {
      await jest.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("status").innerHTML).toEqual("success");
    expect(screen.getByTestId("result").innerHTML).toEqual("3");
  });
});
