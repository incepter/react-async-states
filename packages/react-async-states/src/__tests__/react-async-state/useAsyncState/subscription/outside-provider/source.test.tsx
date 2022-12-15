import * as React from "react";
import {fireEvent, render, screen, act} from "@testing-library/react";
import {UseAsyncState} from "../../../../../types.internal";
import {useAsyncState} from "../../../../../useAsyncState";
import AsyncStateComponent from "../../../utils/AsyncStateComponent";
import {createSource} from "../../async-states-core";

describe('should subscribe to a module level source object', () => {
  it('should share state by source between two components', () => {
    // given
    const source = createSource<number>(
      "counter",
      null,
      {initialValue: 0}
    );

    function Controls() {
      const {run}: UseAsyncState<number> = useAsyncState(source);

      return (
        <div>
          <button data-testid="increment"
                  onClick={() => run(old => old.data + 1)}>increment
          </button>
          <button data-testid="decrement"
                  onClick={() => run(old => old.data - 1)}>decrement
          </button>
        </div>
      );
    }

    function Test() {
      return (
        <>
          <Controls/>
          <AsyncStateComponent config={source}>
            {({state}: UseAsyncState<number>) => (
              <span data-testid="count-a">{state.data}</span>
            )}
          </AsyncStateComponent>
          <AsyncStateComponent config={source}>
            {({state}: UseAsyncState<number>) => (
              <span data-testid="count-b">{state.data}</span>
            )}
          </AsyncStateComponent>
        </>
      );
    }

    // when
    jest.useFakeTimers();
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )
    const incrementBtn = screen.getByTestId("increment");
    const decrementBtn = screen.getByTestId("decrement");

    // then
    expect(screen.getByTestId("count-a").innerHTML).toEqual("0");
    expect(screen.getByTestId("count-b").innerHTML).toEqual("0");


    act(() => {
      fireEvent.click(incrementBtn);
    });


    expect(screen.getByTestId("count-a").innerHTML).toEqual("1");
    expect(screen.getByTestId("count-b").innerHTML).toEqual("1");

    fireEvent.click(decrementBtn);


    expect(screen.getByTestId("count-a").innerHTML).toEqual("0");
    expect(screen.getByTestId("count-b").innerHTML).toEqual("0");
  });
  it('should fork a source async state', () => {
    // given
    const source = createSource<number>(
      "counter",
      null,
      {initialValue: 0}
    );

    function Test() {
      return (
        <>
          <AsyncStateComponent config={source}>
            {({state, run}: UseAsyncState<number>) => (
              <>
                <button
                  data-testid="increment-a"
                  onClick={() => run(old => old.data + 1)}
                >
                  increment b
                </button>
                <span data-testid="count-a">{state.data}</span>
              </>
            )}
          </AsyncStateComponent>
          <AsyncStateComponent config={{source, fork: true}}>
            {({state, run}: UseAsyncState<number>) => (
              <>
                <button
                  data-testid="increment-b"
                  onClick={() => run(old => old.data + 1)}
                >
                  increment b
                </button>
                <span data-testid="count-b">{state.data}</span>
              </>
            )}
          </AsyncStateComponent>
        </>
      );
    }

    // when
    jest.useFakeTimers();
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )
    const incrementABtn = screen.getByTestId("increment-a");
    const incrementBBtn = screen.getByTestId("increment-b");

    // then
    expect(screen.getByTestId("count-a").innerHTML).toEqual("0");
    expect(screen.getByTestId("count-b").innerHTML).toEqual("0");

    fireEvent.click(incrementABtn);

    expect(screen.getByTestId("count-a").innerHTML).toEqual("1");
    expect(screen.getByTestId("count-b").innerHTML).toEqual("0");

    fireEvent.click(incrementBBtn);

    expect(screen.getByTestId("count-a").innerHTML).toEqual("1");
    expect(screen.getByTestId("count-b").innerHTML).toEqual("1");
  });
});
