import * as React from "react";
import {render, screen, act, fireEvent} from "@testing-library/react";
import {UseAsyncStateReturnValue} from "../../../../../types.internal";
import {useAsyncState} from "../../../../../hooks/useAsyncState";

describe('should render initial value', () => {
  it('should subscribe and get initial value, increment and decrement via run', async () => {
    // given
    function Component() {
      const {state, run, replaceState} : UseAsyncStateReturnValue<number, number> = useAsyncState({
        producer(props): number {
          return props.args[0];
        },
        initialValue: 0,
        selector: d => d.data,
      });
      function increment() {
        run(state + 1);
      }
      function decrement() {
        run(state - 1);
      }
      function incrementReplaceState() {
        replaceState(old => old.data + 1);
      }
      function decrementReplaceState() {
        replaceState(old => old.data - 1);
      }
      return (
        <div>
          <button data-testid="increment" onClick={increment}>increment</button>
          <button data-testid="decrement" onClick={decrement}>decrement</button>
          <button data-testid="increment-r" onClick={incrementReplaceState}>increment</button>
          <button data-testid="decrement-r" onClick={decrementReplaceState}>decrement</button>
          <span data-testid="result">{state}</span>
      </div>);
    }
    // when

    render(<Component />)

    const incrementBtn = screen.getByTestId("increment");
    const decrementBtn = screen.getByTestId("decrement");
    const incrementRBtn = screen.getByTestId("increment-r");
    const decrementRBtn = screen.getByTestId("decrement-r");
    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("0");

    // +1
    fireEvent.click(incrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("1");

    // +1
    fireEvent.click(incrementRBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("2");

    // -1
    fireEvent.click(decrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("1");

    // -1
    fireEvent.click(decrementRBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("0");
  });
});
