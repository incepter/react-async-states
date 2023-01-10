import * as React from "react";
import {render, screen} from "@testing-library/react";
import {
  UseAsyncState
} from "../../../../../types.internal";
import {useAsyncState} from "../../../../../useAsyncState";
import {mockDateNow, TESTS_TS} from "../../../utils/setup";
import {createSource} from "async-states";

mockDateNow();
describe('should subscribe to an async state in provider', () => {
  it('should subscribe by string key and listen or wait ', async () => {
    // given
    createSource("counter", null, {initialValue: 0});
    createSource("todos", null, {
      initialValue: [{
        title: "Do homework",
        completed: false
      }]
    });

    function Test() {
      return (
        <>
          <Component subscribesTo="todos"/>
          <Component subscribesTo="counter"/>
          <Component subscribesTo="doesntExist" wait/>
        </>
      );
    }

    function Component({
      subscribesTo,
      wait
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
      .toEqual("[\"CONFIG_OBJECT\"]");

    expect(screen.getByTestId("mode-todos").innerHTML)
      .toEqual("[\"CONFIG_OBJECT\"]");

    expect(screen.getByTestId("mode-doesntExist").innerHTML)
      .toEqual("[\"CONFIG_OBJECT\",\"WAIT\"]");

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
