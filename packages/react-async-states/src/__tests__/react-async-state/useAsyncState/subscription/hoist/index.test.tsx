import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {
  AsyncStateSubscriptionMode,
  UseAsyncState
} from "../../../../../types.internal";
import {useAsyncState} from "../../../../../hooks/useAsyncState";
import {AsyncStateProvider} from "../../../../../provider/AsyncStateProvider";
import {flushPromises} from "../../../utils/test-utils";

describe('should hoist an async state to provider', () => {
  it('should wait for an async state to be hoisted and listen ', async () => {
    // given
    function Test() {
      return (
        <AsyncStateProvider>
          <Component subscribesTo="counter"/>
          <Wrapper>
            <Hoister/>
          </Wrapper>
        </AsyncStateProvider>
      );
    }

    function Hoister<T>() {
      const {mode} = useAsyncState.hoist({
        key: "counter",
        initialValue: 0,
      });
      return <span data-testid="hoister-mode">{mode}</span>;
    }

    function Wrapper({children, initialValue = false}) {
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

    function Component({
      subscribesTo,
    }: { subscribesTo: string }) {
      const {
        mode,
        state,
      }: UseAsyncState<number> = useAsyncState(subscribesTo);

      return (
        <div>
          <span data-testid={`mode-${subscribesTo}`}>{mode}</span>
          <span
            data-testid={`result-${subscribesTo}`}>{JSON.stringify(state)}</span>
        </div>);
    }

    // when

    render(<Test/>)

    // then
    expect(screen.getByTestId("mode-counter").innerHTML)
      .toEqual(AsyncStateSubscriptionMode.WAITING);


    act(() => {
      fireEvent.click(screen.getByTestId("toggler"));
    });

    expect(screen.getByTestId("hoister-mode").innerHTML)
      .toEqual(AsyncStateSubscriptionMode.HOIST);
    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByTestId("mode-counter").innerHTML)
      .toEqual(AsyncStateSubscriptionMode.LISTEN);

    expect(screen.getByTestId("result-counter").innerHTML)
      .toEqual(JSON.stringify({
        "status": "initial",
        "data": 0,
        "props": null
      }));
  });
});
