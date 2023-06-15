import * as React from "react";
import {render, screen} from "@testing-library/react";
import {useAsyncState} from "../../useAsyncState";
import {createSource, Source, State} from "async-states";
import {SuccessState} from "async-states/src";

describe('should select from another async state', () => {
  it('should select by source', () => {
    // given
    const counterSource = createSource("counter", null, {initialValue: 30});
    const loggerSource: Source<string, any, any, any[]> = createSource("logger", props => {
      const state = props.select(counterSource);
      if (!state) {
        return "does not exist.";
      }
      if ((state as SuccessState<number, any>)?.data > 20) {
        return "Greater than 20!";
      } else {
        return "Less than or equals 20!";
      }
    }, {});

    function Test() {
      const {state} = useAsyncState.auto(loggerSource);

      return (
        <>
          <span data-testid="result">{state.data}</span>
        </>
      )
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    // then
    expect(screen.getByTestId("result").innerHTML)
      .toEqual("Greater than 20!");
  });
  it('should select by key', () => {
    // given
    const counterSource = createSource("counter-2", null, {initialValue: 15});
    const loggerSource = createSource<string, any, any, any[]>("logger-2", props => {
      const state = props.select("counter-2") as State<number, any, any, any[]>;
      if (!state?.data) {
        return "does not exist.";
      }
      if (state?.data > 20) {
        return "Greater than 20!";
      } else {
        return "Less than or equals 20!";
      }
    }, {});

    function Component() {
      const {state} = useAsyncState({
        source: loggerSource,
        lazy: false
      });

      return <span data-testid="result">{state.data}</span>;
    }

    function Test() {
      return (
        <>
          <Component/>
        </>
      )
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    // then
    expect(screen.getByTestId("result").innerHTML)
      .toEqual("Less than or equals 20!");
  });
});
