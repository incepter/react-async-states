import * as React from "react";
import {render, screen} from "@testing-library/react";
import {useAsyncState} from "../../../../useAsyncState";
import {UseAsyncState} from "../../../../types.internal";
import {AsyncStateProvider} from "../../../../Provider";
import {createSource, Source, State} from "async-states-core";

describe('should select from another async state', () => {
  it('should select by source', () => {
    // given
    const counterSource = createSource("counter", null, {initialValue: 30});
    const loggerSource: Source<string> = createSource("logger", props => {
      const state = props.select(counterSource);
      if (!state?.data) {
        return "does not exist.";
      }
      if (state?.data > 20) {
        return "Greater than 20!";
      } else {
        return "Less than or equals 20!";
      }
    }, {});

    function Test() {
      const {state}: UseAsyncState<string> = useAsyncState.auto(loggerSource);

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
    const counterSource = createSource("counter", null, {initialValue: 15});
    const loggerSource: Source<string> = createSource("logger", props => {
      const state = props.select("counter") as State<number>;
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
      const {state}: UseAsyncState<string> = useAsyncState({
        source: loggerSource,
        lazy: false
      });

      return <span data-testid="result">{state.data}</span>;
    }

    function Test() {
      return (
        <AsyncStateProvider initialStates={[counterSource, loggerSource]}>
          <Component/>
        </AsyncStateProvider>
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
