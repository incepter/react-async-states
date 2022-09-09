import * as React from "react";
import {act, render, screen, fireEvent} from "@testing-library/react";
import {useAsyncState} from "../../../../react/useAsyncState";
import {UseAsyncState} from "../../../../types.internal";
import {flushPromises} from "../../utils/test-utils";
import {AsyncStateStatus} from "../../../../async-state";

describe('should emit from producer', () => {
  it('should emit after resolve when sync', async () => {
    // given
    jest.useFakeTimers();

    function producer(props) {
      let intervalId = setInterval(() => {
        props.emit(old => (old.data + 1) ?? 0)
      }, 100);
      props.onAbort(() => clearInterval(intervalId));
      return 0;
    }

    function Component() {
      const {state}: UseAsyncState<any> = useAsyncState.auto(producer);

      return <span data-testid="result">{state.data}</span>;
    }

    // when
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("0");

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("1");

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("2");
  });
  it('should emit after resolve when async', async () => {
    // given
    jest.useFakeTimers();

    function producer(props) {
      let intervalId = setInterval(() => {
        props.emit(old => (old.data + 1) ?? 0)
      }, 100);
      props.onAbort(() => clearInterval(intervalId));
      return new Promise((resolve) => resolve(0));
    }

    function Component() {
      const {state}: UseAsyncState<any> = useAsyncState.auto(producer);

      return <span data-testid="result">{state.data}</span>;
    }

    // when
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("");

    await act(async () => {
      await flushPromises();
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("0");

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("1");

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("2");
  });
  it('should stop emitting after abort', async () => {
    // given
    jest.useFakeTimers();
    const abortFn = jest.fn();

    function producer(props) {
      let intervalId = setInterval(() => {
        props.emit(old => (old.data + 1) ?? 0)
      }, 100);
      props.onAbort(() => clearInterval(intervalId));
      props.onAbort(abortFn);
      return 0;
    }

    function Component() {
      const {state, abort}: UseAsyncState<any> = useAsyncState({
        producer,
        lazy: false
      });

      return (
        <>
          <button data-testid="abort" onClick={() => abort("tt")}>abort</button>
          <span data-testid="status">{state.status}</span>
          <span data-testid="result">{state.data}</span>
        </>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("0");

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("1");

    await act(async () => {
      fireEvent.click(screen.getByTestId("abort"));
    });
    expect(abortFn).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(abortFn).toHaveBeenCalledWith("tt");
    expect(screen.getByTestId("status").innerHTML)
      .toEqual(AsyncStateStatus.success);

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("1");
  });
  it('should emit before resolve and do nothing', async () => {
    // given
    jest.useFakeTimers();
    const mockedFn = jest.fn();

    function producer(props) {
      props.emit(old => {
        mockedFn("called");
        return (old.data + 1) ?? 0;
      });
      return 0;
    }

    function Component() {
      const {state}: UseAsyncState<any> = useAsyncState({
        producer,
        lazy: false
      });

      return <span data-testid="result">{state.data}</span>;
    }

    const globalErrorLog = console.error;
    const mockedErrorLog = jest.fn();
    console.error = mockedErrorLog;
    // when
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("0");
    expect(mockedFn).not.toHaveBeenCalled();
    expect(mockedErrorLog).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(mockedErrorLog).toHaveBeenCalledWith("Called props.emit before the producer resolves. This is not supported in the library and will have no effect")

    console.error = globalErrorLog;
  });
});
