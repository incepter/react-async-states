import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {
  UseAsyncState
} from "../../types.internal";
import {useAsync} from "../../useAsync";
import {createSource, ForkConfig} from "async-states";

let originalConsoleError = console.error
describe('should fork an initially hoisted async state', () => {
  beforeAll(() => {
    console.error = jest.fn().mockImplementation(() => {})
  })
  afterAll(() => {
    console.error = originalConsoleError
  })
  it('should fork and update both states ', async () => {
    // given

    createSource("counter", null, {initialValue: 0});

    function Test() {
      return (
        <>
          <Component subKey="counter"/>
          <Component forkConfig={{key: "counter-fork"}} subKey="counter" fork/>
        </>
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
      }: UseAsyncState<number, any, any, any[]> = useAsync({
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
      .toEqual("[\"CONFIG_OBJECT\"]");
    expect(screen.getByTestId("mode-counter-fork").innerHTML)
      .toEqual("[\"CONFIG_OBJECT\",\"FORK\"]");

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