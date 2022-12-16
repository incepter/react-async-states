import * as React from "react";
import {render, screen} from "@testing-library/react";
import {
  UseAsyncState
} from "../../../../../types.internal";
import {useAsyncState} from "../../../../../useAsyncState";
import {AsyncStateProvider} from "../../../../../Provider";
import {mockDateNow, TESTS_TS} from "../../../utils/setup";
import {createSource} from "async-states-core";

mockDateNow();
describe('should subscribe to an async state in provider', () => {
  it('should subscribe by string key and listen or wait ', async () => {
    // given
    const todosSource = createSource("todos", null, {
      initialValue: [{
        title: "Do homework",
        completed: false
      }]
    });
    const counterSource = createSource("counter", null, {initialValue: 0});

    function Test() {
      return (
        <AsyncStateProvider initialStates={[counterSource, todosSource]}>
          <Component subscribesTo="todos"/>
          <Component subscribesTo="counter"/>
          <Component subscribesTo="doesntExist"/>
        </AsyncStateProvider>
      );
    }

    function Component({
      subscribesTo,
    }: { subscribesTo: string }) {
      const {
        devFlags,
        state,
      }: UseAsyncState<number> = useAsyncState(subscribesTo);

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
      .toEqual("[\"CONFIG_STRING\",\"INSIDE_PROVIDER\"]");

    expect(screen.getByTestId("mode-todos").innerHTML)
      .toEqual("[\"CONFIG_STRING\",\"INSIDE_PROVIDER\"]");

    expect(screen.getByTestId("mode-doesntExist").innerHTML)
      .toEqual("[\"CONFIG_STRING\",\"INSIDE_PROVIDER\",\"WAIT\"]");

    expect(screen.getByTestId("result-todos").innerHTML)
      .toEqual(JSON.stringify({
        "status": "initial",
        "data": [{"title": "Do homework", "completed": false}],
        "props": null,
        "timestamp": TESTS_TS,
      }));
    expect(screen.getByTestId("result-counter").innerHTML)
      .toEqual(JSON.stringify({
        "status": "initial",
        "data": 0,
        "props": null,
        "timestamp": TESTS_TS,
      }));
    expect(screen.getByTestId("result-doesntExist").innerHTML)
      .toEqual("");
  });
});
