import * as React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import {AsyncStateProvider} from "../../../react/AsyncStateProvider";
import {SubscriptionMode} from "../../../types.internal";
import {useProducer} from "../../../react/useAsyncStateBase";

describe('should useProducer', () => {
  it('should use a global producer ', async () => {
    // given
    function Test() {
      return (
        <Component/>
      );
    }

    function producer(props) {
      return props.args[0];
    }

    function Component() {
      const {
        run,
        mode,
        state,
      } = useProducer(producer);

      function increment() {
        run((state.data ?? 0) + 1);
      }

      return (
        <div>
          <button data-testid="increment" onClick={increment}>increment</button>
          <span data-testid="mode">{mode}</span>
          <span data-testid="result">{state.data}</span>
        </div>);
    }

    // when

    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    const incrementBtn = screen.getByTestId("increment");
    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("");
    expect(screen.getByTestId("mode").innerHTML)
      .toEqual(SubscriptionMode.STANDALONE);

    // +1
    fireEvent.click(incrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("1");
    fireEvent.click(incrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("2");
  });
  it('should use a global producer inside provider ', async () => {
    // given
    function Test() {
      return (
        <AsyncStateProvider>
          <Component/>
        </AsyncStateProvider>
      );
    }

    function producer(props) {
      return props.args[0];
    }

    function Component() {
      const {
        run,
        mode,
        state,
      } = useProducer(producer);

      function increment() {
        run((state.data ?? 0) + 1);
      }

      return (
        <div>
          <button data-testid="increment" onClick={increment}>increment</button>
          <span data-testid="mode">{mode}</span>
          <span data-testid="result">{state.data}</span>
        </div>);
    }

    // when

    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    const incrementBtn = screen.getByTestId("increment");
    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("");
    expect(screen.getByTestId("mode").innerHTML)
      .toEqual(SubscriptionMode.STANDALONE);

    // +1
    fireEvent.click(incrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("1");
    fireEvent.click(incrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("2");
  });
});
