import * as React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import {
  UseAsyncState
} from "../../../../../types.internal";
import {useAsyncState} from "../../../../../useAsyncState";
import {AsyncStateProvider} from "../../../../../Provider";

describe('should declare a standalone producer inside a provider', () => {
  it('should declare a standalone producer inside a provider ', async () => {
    // given
    function Test() {
      return (
        <AsyncStateProvider>
          <Component/>
        </AsyncStateProvider>
      );
    }

    function Component() {
      const {
        run,
        devFlags,
        state,
      } = useAsyncState({
          selector: d => d.data,
          producer(props) {
            return props.args[0];
          },
          initialValue: 0,
        });

      function increment() {
        run(state + 1);
      }

      function decrement() {
        run(state - 1);
      }

      return (
        <div>
          <button data-testid="increment" onClick={increment}>increment</button>
          <button data-testid="decrement" onClick={decrement}>decrement</button>
          <span data-testid="mode">{JSON.stringify(devFlags)}</span>
          <span data-testid="result">{state}</span>
        </div>);
    }

    // when

    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    const incrementBtn = screen.getByTestId("increment");
    const decrementBtn = screen.getByTestId("decrement");
    // then
    expect(screen.getByTestId("mode").innerHTML)
      .toEqual("[\"CONFIG_OBJECT\",\"STANDALONE\",\"INSIDE_PROVIDER\",\"SELECTOR\"]");

    // +1
    fireEvent.click(incrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("1");

    // -1
    fireEvent.click(decrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("0");
  });
  it('should declare a standalone producer inside a provider with key ', async () => {
    // given
    function Test() {
      return (
        <AsyncStateProvider>
          <Component/>
        </AsyncStateProvider>
      );
    }

    function Component() {
      const {
        devFlags,
      }: UseAsyncState<number, number> = useAsyncState({
        key: "standalone",
        producer(props) {
          return props.args[0];
        },
        initialValue: 0,
        selector: d => d.data,
      });
      return <span data-testid="mode">{JSON.stringify(devFlags)}</span>;
    }

    // when

    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    // then
    expect(screen.getByTestId("mode").innerHTML)
      .toEqual("[\"CONFIG_OBJECT\",\"INSIDE_PROVIDER\",\"WAIT\",\"SELECTOR\"]");
  });
});
