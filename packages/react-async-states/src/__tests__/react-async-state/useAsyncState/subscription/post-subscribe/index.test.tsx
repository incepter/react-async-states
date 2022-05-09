import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {createSource} from "../../../../../helpers/create-async-state";
import AsyncStateComponent from "../../../utils/AsyncStateComponent";
import {UseAsyncState} from "../../../../../types.internal";
import {AsyncStateStatus} from "../../../../../async-state";
import {mockDateNow, TESTS_TS} from "../../../utils/setup";

mockDateNow();
describe('should post subscribe', () => {
  it('should invoke post subscribe when present and run producer' +
    ' and run post unsubscribe', async () => {
    jest.useFakeTimers();
    // given
    const onAbort = jest.fn();
    const producer = jest.fn().mockImplementation(props => {
      return new Promise(resolve => {
        let id = setTimeout(() => resolve(props.args[0]), 10);
        props.onAbort(onAbort);
        props.onAbort(() => clearTimeout(id));
      });
    });
    const counterSource = createSource("counter", producer, {initialValue: 0});
    const onUnsubscribe = jest.fn();

    const mocked = jest.fn();
    const postSubscribe = jest.fn().mockImplementation(({
      run,
      mode,
      getState
    }) => {
      mocked(getState());
      const abort = run("hourray!");
      return function cleanup() {
        abort();
        onUnsubscribe();
      }
    });
    const config = {
      events: {
        subscribe: postSubscribe,
      },
      source: counterSource,
    };

    function Wrapper({children, initialValue = true}) {
      const [visible, setVisible] = React.useState(initialValue);

      return (
        <div>
          <button data-testid="toggler" onClick={() => setVisible(old => !old)}>
            {visible ? "hide" : "show"}
          </button>
          {visible && children}
        </div>
      );
    }

    function Test() {
      return (
        <Wrapper>
          <AsyncStateComponent config={config}>
            {({state, run}: UseAsyncState<number>) => (
              <>
                <button data-testid="run"
                        onClick={() => run("test")}>{state.data}</button>
                <span data-testid="status">{state.status}</span>
                <span data-testid="result">{state.data}</span>
              </>
            )}
          </AsyncStateComponent>
        </Wrapper>
      );
    }

    // when
    render(<Test/>);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(producer).toHaveBeenCalledTimes(1);
    expect(postSubscribe).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.advanceTimersByTime(10);
    });

    expect(screen.getByTestId("result").innerHTML).toEqual("hourray!");
    expect(mocked).toHaveBeenCalledWith({
      status: AsyncStateStatus.initial,
      timestamp: TESTS_TS,
      props: null,
      data: 0
    });

    act(() => {
      fireEvent.click(screen.getByTestId("run"));
    });

    await act(async () => {
      await jest.advanceTimersByTime(9);
    });

    expect(screen.getByTestId("status").innerHTML).toEqual(AsyncStateStatus.pending);

    onAbort.mockClear();
    act(() => {
      fireEvent.click(screen.getByTestId("toggler"));
    });
    expect(onAbort).toHaveBeenCalledTimes(1);
    expect(onUnsubscribe).toHaveBeenCalledTimes(1);
  });

});
