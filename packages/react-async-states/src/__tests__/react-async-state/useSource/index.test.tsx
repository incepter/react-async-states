import * as React from "react";
import {act, render, screen} from "@testing-library/react";
import {useSource} from "../../../react/useAsyncStateBase";
import {SubscriptionMode} from "../../../types.internal";
import {createSource} from "../../../async-state";

describe('should useSource', () => {
  it('should use a source and subscribe to it ', async () => {
    // given
    function Test() {
      return (
        <Component/>
      );
    }

    const source = createSource("test-source", null, {initialValue: 8});

    function Component() {
      const {
        run,
        mode,
        state,
      } = useSource(source);

      return (
        <div>
          <span data-testid="mode">{mode}</span>
          <span data-testid="result">{state.data}</span>
        </div>);
    }

    // when

    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("8");
    expect(screen.getByTestId("mode").innerHTML)
      .toEqual(SubscriptionMode.SRC);

    act(() => {
      source.setState(5);
    });

    expect(screen.getByTestId("result").innerHTML).toEqual("5");
  });
});
