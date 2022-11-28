import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {
  UseAsyncState
} from "../../../../../types.internal";
import {useAsyncState} from "../../../../../react/useAsyncState";
import {AsyncStateProvider} from "../../../../../react/Provider";
import {createSource, ForkConfig} from "../../../../../async-state";

describe('should fork an initially hoisted async state', () => {
  it('should fork and update both states ', async () => {
    // given
    const counterSource = createSource("counter", null, {initialValue: 0});

    function Test() {
      return (
        <AsyncStateProvider initialStates={[counterSource]}>
          <Component subKey="counter"/>
          <Component forkConfig={{key: "counter-fork"}} subKey="counter" fork/>
        </AsyncStateProvider>
      );
    }

    function Component({
      subKey,
      fork = undefined,
      forkConfig = undefined,
    }: { subKey: string, fork?: boolean, forkConfig?: ForkConfig }) {
      const {
        key,
        run,
        devFlags,
        state,
      }: UseAsyncState<number> = useAsyncState({
        fork,
        forkConfig,
        key: subKey,
      });

      return (
        <div>
          <button data-testid={`increment-${key}`}
                  onClick={() => run(old => old.data + 1)}>Increment
          </button>
          <span data-testid={`mode-${key}`}>{JSON.stringify(devFlags)}</span>
          <span
            data-testid={`result-${key}`}>{state.data}</span>
        </div>);
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    // then
    expect(screen.getByTestId("mode-counter").innerHTML)
      .toEqual("[\"CONFIG_OBJECT\",\"INSIDE_PROVIDER\"]");
    expect(screen.getByTestId("mode-counter-fork").innerHTML)
      .toEqual("[\"CONFIG_OBJECT\",\"FORK\",\"INSIDE_PROVIDER\"]");

    expect(screen.getByTestId("result-counter").innerHTML).toEqual("0");
    expect(screen.getByTestId("result-counter-fork").innerHTML).toEqual("0");

    act(() => {
      fireEvent.click(screen.getByTestId("increment-counter"));
    });
    expect(screen.getByTestId("result-counter").innerHTML).toEqual("1");
    expect(screen.getByTestId("result-counter-fork").innerHTML).toEqual("0");

    act(() => {
      fireEvent.click(screen.getByTestId("increment-counter-fork"));
    });
    expect(screen.getByTestId("result-counter").innerHTML).toEqual("1");
    expect(screen.getByTestId("result-counter-fork").innerHTML).toEqual("1");
  });
});
