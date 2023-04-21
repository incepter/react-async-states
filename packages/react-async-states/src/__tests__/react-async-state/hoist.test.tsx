import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {
  UseAsyncState
} from "../../types.internal";
import {useAsyncState} from "../../useAsyncState";
import {flushPromises} from "../utils/test-utils";
import {mockDateNow, TESTS_TS} from "../utils/setup";


mockDateNow();
describe('should hoist an async state to pool', () => {
  it('should wait for an async state to be hoisted and listen ', async () => {
    // given
    function Test() {
      return (
        <>
          <Component subscribesTo="counter" wait/>
          <Wrapper>
            <Hoister/>
          </Wrapper>
        </>
      );
    }

    function Hoister<T>() {
      const {devFlags, source} = useAsyncState({
        key: "counter",
        initialValue: 0,
      });
      return <span data-testid="hoister-mode">{JSON.stringify(devFlags)}</span>;
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
      subscribesTo, wait
    }: { subscribesTo: string, wait?: boolean }) {
      const {
        devFlags,
        state,
      }: UseAsyncState<number> = useAsyncState({key: subscribesTo, wait});


      return (
        <div>
          <span data-testid={`mode-${subscribesTo}`}>{JSON.stringify(devFlags)}</span>
          <span
            data-testid={`result-${subscribesTo}`}>{JSON.stringify(state)}</span>
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
      .toEqual("[\"CONFIG_OBJECT\",\"WAIT\"]");


    act(() => {
      fireEvent.click(screen.getByTestId("toggler"));
    });

    expect(screen.getByTestId("hoister-mode").innerHTML)
      .toEqual("[\"CONFIG_OBJECT\"]");
    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByTestId("mode-counter").innerHTML)
      .toEqual("[\"CONFIG_OBJECT\"]");

    expect(screen.getByTestId("result-counter").innerHTML)
      .toEqual(JSON.stringify({
        "status": "initial",
        "data": 0,
        "props": null,
        "timestamp": TESTS_TS,
      }));
  });
});
