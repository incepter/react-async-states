import * as React from "react";
import { render } from "@testing-library/react";
import { mockDateNow } from "../../utils/setup";
import Provider from "../../../provider/Provider";
import AsyncStateComponent from "../../utils/AsyncStateComponent";
import { createContext, createSource } from "async-states";
import { useAsync } from "../../../hooks/useAsync_export";

mockDateNow();
jest.mock("../../../Provider/context", () => {
  return {
    ...jest.requireActual("../../../Provider/context"),
    isServer: true,
  };
});

describe("global sources in the server", () => {
  let globalSource = createSource("test-1", null, { initialValue: 9 });
  it("should automatically create a new source when used in the server " +
    "when using useAsync(source)", async () => {
    console.error = jest.fn();

    let _source: typeof globalSource | null = null;
    function Component() {
      let { source } = useAsync(globalSource);
      _source = source;

      return null;
    }

    // given
    function Test() {
      return (
        <Provider id="test">
          <div data-testid="parent">
            <Component />
          </div>
        </Provider>
      );
    }
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );

    expect(_source).not.toBe(null);
    expect(globalSource).not.toBe(_source);

    _source!.setState(15);
    expect(_source!.getState().data).toBe(15);
    expect(globalSource.getState().data).toBe(9);
  });
  it("should automatically create a new source when used in the server " +
    "when using useAsync({ source })", async () => {
    console.error = jest.fn();

    let _source: typeof globalSource | null = null;
    function Component() {
      let { source } = useAsync({ source: globalSource });
      _source = source;

      return null;
    }

    // given
    function Test() {
      return (
        <Provider id="test">
          <div data-testid="parent">
            <Component />
          </div>
        </Provider>
      );
    }
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );

    expect(_source).not.toBe(null);
    expect(globalSource).not.toBe(_source);

    _source!.setState(20);
    expect(_source!.getState().data).toBe(20);
    expect(globalSource.getState().data).toBe(9);
  });
});
