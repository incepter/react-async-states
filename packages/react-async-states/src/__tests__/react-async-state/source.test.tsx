import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {useAsync} from "../../useAsync";
import AsyncStateComponent from "../utils/AsyncStateComponent";
import {createSource} from "async-states";

describe('should subscribe to a module level source object', () => {
  it('should share state by source between two components', () => {
    // given
    const source = createSource<number, any, any, any[]>(
      "counter-2",
      null,
      {initialValue: 0}
    );

    function Controls() {
      useAsync(source);

      return (
        <div>
          <button data-testid="increment"
                  onClick={() => source.run(old => old.data + 1)}>increment
          </button>
          <button data-testid="decrement"
                  onClick={() => source.run(old => old.data - 1)}>decrement
          </button>
        </div>
      );
    }

    function Test() {
      return (
        <>
          <Controls/>
          <AsyncStateComponent config={source}>
            {({state}) => (
              <span data-testid="count-a">{state.data}</span>
            )}
          </AsyncStateComponent>
          <AsyncStateComponent config={source}>
            {({state}) => (
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
    const source = createSource<number, any, any, any>(
      "counter",
      null,
      {initialValue: 0}
    );

    function Test() {
      return (
        <>
          <AsyncStateComponent config={source}>
            {({state, source: {run}}) => (
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
            {({state, source: {run}}) => (
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
