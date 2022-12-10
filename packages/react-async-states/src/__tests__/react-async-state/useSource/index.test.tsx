import * as React from "react";
import {act, render, screen} from "@testing-library/react";
import {createSource} from "../../../async-state";
import {useSource} from "../../../react/useSource";

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
        devFlags,
        state,
      } = useSource(source);

      return (
        <div>
          <span data-testid="mode">{JSON.stringify(devFlags)}</span>
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
      .toEqual("[\"CONFIG_SOURCE\",\"SOURCE\"]");

    act(() => {
      source.setState(5);
    });

    expect(screen.getByTestId("result").innerHTML).toEqual("5");
  });
});
