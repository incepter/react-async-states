import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {
  UseAsyncState,
  UseSelectedAsyncState
} from "../../../../../types.internal";
import {useAsyncState} from "../../../../../hooks/useAsyncState";
import {AsyncStateStatus} from "../../../../../../../async-state";

describe('should subscribe -- sync', () => {
  it('should subscribe and get initial value, ' +
    'increment and decrement sync via run and replace state', async () => {
    // given
    function Component() {
      const {
        state,
        run,
        replaceState
      }: UseSelectedAsyncState<number, number> = useAsyncState({
        producer(props) {
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
          <button data-testid="increment-r"
                  onClick={incrementReplaceState}>increment
          </button>
          <button data-testid="decrement-r"
                  onClick={decrementReplaceState}>decrement
          </button>
          <span data-testid="result">{state}</span>
        </div>);
    }

    // when

    render(<Component/>)

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

describe('should subscribe -- async', () => {
  it('should subscribe and get initial value, and perform async call', async () => {
    // given
    const pendingText = "loading...";

    function Component() {
      const {
        state: {status, data},
        run
      }: UseAsyncState<number> = useAsyncState({
        producer(props): Promise<number> {
          return new Promise<number>((resolve => {
            let id = setTimeout(() => resolve(props.args[0]), 100);
            props.onAbort(() => clearTimeout(id));
          }));
        },
        initialValue: 0,
      });

      function increment() {
        run(data + 1);
      }

      function decrement() {
        run(data - 1);
      }

      const isPending = status === AsyncStateStatus.pending;
      return (
        <div>
          <button data-testid="increment" onClick={increment}>increment</button>
          <button data-testid="decrement" onClick={decrement}>decrement</button>
          <span data-testid="pending">{isPending ? pendingText : ""}</span>
          <span data-testid="result">{data}</span>
        </div>);
    }

    // when

    jest.useFakeTimers();
    render(<Component/>)

    const incrementBtn = screen.getByTestId("increment");
    const decrementBtn = screen.getByTestId("decrement");
    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("0");
    expect(screen.getByTestId("pending").innerHTML).toEqual("");

    // +1
    act(() => {
      fireEvent.click(incrementBtn);
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("");
    expect(screen.getByTestId("pending").innerHTML).toEqual(pendingText);

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    expect(screen.getByTestId("result").innerHTML).toEqual("1");
    expect(screen.getByTestId("pending").innerHTML).toEqual("");

    // -1
    act(() => {
      fireEvent.click(decrementBtn)
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("");
    expect(screen.getByTestId("pending").innerHTML).toEqual(pendingText);

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    expect(screen.getByTestId("result").innerHTML).toEqual("0");
    expect(screen.getByTestId("pending").innerHTML).toEqual("");
  });
});
