import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {UseAsyncState} from "../../../../types.internal";
import {useAsyncState} from "../../../../useAsyncState";
import {Status} from "../async-states-core";

describe('should run async state with generator', () => {
  it('should run sync generator', async () => {
    // given
    function Component() {
      const {state}: UseAsyncState<number> = useAsyncState.auto(function* producer() {
        yield 1;
        yield 2;
        return yield 3;
      });

      return <span data-testid="result">{state.data}</span>;
    }

    // when

    render(
      <React.StrictMode>
        <Component/>
      </React.StrictMode>
    )

    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("3");
  });
  it('should run sync generator and throw', async () => {
    // given
    function Component() {
      const {state}: UseAsyncState<number> = useAsyncState.auto(function* producer() {
        yield 1;
        yield 2;
        throw new Error("Error there!")
      });

      return (
        <div>
          <span data-testid="status">{state.status}</span>
          <span data-testid="result">{state.data?.toString()}</span>
        </div>
      );
    }

    // when

    render(
      <React.StrictMode>
        <Component/>
      </React.StrictMode>
    )

    // then
    expect(screen.getByTestId("status").innerHTML).toEqual(Status.error);
    expect(screen.getByTestId("result").innerHTML).toEqual("Error: Error there!");
  });
  it('should run sync generator try and catch', async () => {
    // given
    function Component() {
      const {state}: UseAsyncState<number> = useAsyncState.auto(function* producer() {
        try {
          yield 1;
          yield 2;
          throw new Error("Error there!")
        } catch (e) {
          return yield 15;
        }
      });

      return (
        <div>
          <span data-testid="status">{state.status}</span>
          <span data-testid="result">{state.data?.toString()}</span>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Component/>
      </React.StrictMode>
    )

    // then
    expect(screen.getByTestId("status").innerHTML).toEqual(Status.success);
    expect(screen.getByTestId("result").innerHTML).toEqual("15");
  });
  it('should run async generator and throw', async () => {
    // given
    jest.useFakeTimers();
    function Component() {
      const {state}: UseAsyncState<number> = useAsyncState.auto(function* producer() {
        yield 1;
        yield new Promise(res => setTimeout(res, 100));
        throw new Error("Error there!!")
      });

      return (
        <div>
          <span data-testid="status">{state.status}</span>
          <span data-testid="result">{state.data?.toString()}</span>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Component/>
      </React.StrictMode>
    )

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    // then
    expect(screen.getByTestId("status").innerHTML).toEqual(Status.error);
    expect(screen.getByTestId("result").innerHTML).toEqual("Error: Error there!!");
  });
  it('should run async generator and abort it and make sure it doesnt continute', async () => {
    // given
    jest.useFakeTimers();
    const mockedFn = jest.fn();

    function Component() {
      const {
        run,
        state,
        abort,
      }: UseAsyncState<number> = useAsyncState.auto(function* producer() {
        yield 1;
        const a = yield new Promise(resolve => setTimeout(() => resolve("a"), 100));
        const b = yield new Promise(resolve => setTimeout(() => resolve("b"), 100));
        const c = yield new Promise(resolve => setTimeout(() => resolve("c"), 100));
        // const [b, c] = yield Promise.all([
        //   new Promise(resolve => setTimeout(() => resolve("b"), 100)),
        //   new Promise(resolve => setTimeout(() => resolve("c"), 100))
        // ]);
        mockedFn();
        yield 5;
        return yield {a, b, c};
      });


      return (
        <div>
          <button data-testid="run" onClick={() => run()}>run</button>
          <button data-testid="abort" onClick={() => abort()}>abort</button>
          <span data-testid="result">{JSON.stringify(state.data ?? {})}</span>
          <span data-testid="status">{state.status}</span>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Component/>
      </React.StrictMode>
    )

    await act(async () => {
      await jest.advanceTimersByTime(100);
      await jest.advanceTimersByTime(100);
      await jest.advanceTimersByTime(100);
    });

    // then
    expect(mockedFn).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(screen.getByTestId("status").innerHTML).toEqual(Status.success);
    expect(screen.getByTestId("result").innerHTML).toEqual(JSON.stringify({
      "a": {},
      "b": {},
      "c": {}
    }));

    act(() => {
      fireEvent.click(screen.getByTestId("run"));
    });

    mockedFn.mockClear();
    await act(async () => {
      await jest.advanceTimersByTime(100);
      fireEvent.click(screen.getByTestId("abort"));
    });

    expect(screen.getByTestId("status").innerHTML).toEqual(Status.aborted);
    expect(mockedFn).not.toHaveBeenCalled();
  });
});
