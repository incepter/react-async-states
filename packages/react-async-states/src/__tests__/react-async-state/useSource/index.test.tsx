import * as React from "react";
import {act, render, screen} from "@testing-library/react";
import {useSource} from "../../../hooks/useAsyncStateBase";
import {AsyncStateSubscriptionMode} from "../../../types.internal";
import {createSource} from "../../../helpers/create-async-state";
import {replaceState} from "../../../helpers/source-utils";

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
      .toEqual(AsyncStateSubscriptionMode.SOURCE);

    act(() => {
      replaceState(source, 5);
    });

    expect(screen.getByTestId("result").innerHTML).toEqual("5");
  });
});
