import * as React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import {AsyncStateProvider} from "../../../Provider";
import {useProducer} from "../../../useProducer";

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
        state,
        devFlags,
      } = useProducer(producer);

      function increment() {
        run((state.data ?? 0) + 1);
      }

      return (
        <div>
          <button data-testid="increment" onClick={increment}>increment</button>
          <span data-testid="mode">{JSON.stringify(devFlags)}</span>
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
      .toEqual("[\"CONFIG_FUNCTION\",\"STANDALONE\"]");

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
        devFlags,
        state,
      } = useProducer(producer);

      function increment() {
        run((state.data ?? 0) + 1);
      }

      return (
        <div>
          <button data-testid="increment" onClick={increment}>increment</button>
          <span data-testid="mode">{JSON.stringify(devFlags)}</span>
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
      .toEqual("[\"CONFIG_FUNCTION\",\"INSIDE_PROVIDER\",\"STANDALONE\"]");

    // +1
    fireEvent.click(incrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("1");
    fireEvent.click(incrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("2");
  });
});
