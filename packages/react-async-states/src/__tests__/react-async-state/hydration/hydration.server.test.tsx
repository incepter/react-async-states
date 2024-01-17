import * as React from "react";
import { render, screen } from "@testing-library/react";
import Provider from "../../../provider/Provider";
import { createContext, createSource } from "async-states";
import { mockDateNow } from "../../utils/setup";
import AsyncStateComponent from "../../utils/AsyncStateComponent";
import HydrationComponent from "../../../hooks/modules/HydrationComponent";

mockDateNow();
jest.mock("../../../Provider/context", () => {
  return {
    ...jest.requireActual("../../../Provider/context"),
    isServer: true,
  };
});
describe("should hydrate async states", () => {
  it("should perform basic Provider", async () => {
    // given
    let ctx = {};
    createContext(ctx);
    let src = createSource("counter", null, { initialValue: 0, context: ctx });
    function Test() {
      return (
        <div data-testid="parent">
          <Provider context={ctx}>
            <AsyncStateComponent config={src} />
            <HydrationComponent target={[src]} />
          </Provider>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );

    expect(screen.getByTestId("parent").innerHTML).toEqual(
      '<script id="$$as-:r1:">window.__$$_HD=Object.assign(window.__$$_HD||{},{"counter":[{"status":"initial","data":0,"timestamp":1487076708000,"props":{"args":[0],"payload":{}}},null,null]})</script>'
    );
  });
  it("should perform basic Provider when status did succeed", async () => {
    // given
    let ctx = {};
    createContext(ctx);
    let src = createSource("state-1", null, { initialValue: 15, context: ctx });
    src.setState(42);
    function Test() {
      return (
        <div data-testid="parent">
          <Provider context={ctx}>
            <AsyncStateComponent config={src} />
            <HydrationComponent target={[src]} />
          </Provider>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );
    expect(screen.getByTestId("parent").innerHTML).toEqual(
      '<script id="$$as-:r1:">window.__$$_HD=Object.assign(window.__$$_HD||{},{"state-1":[{"status":"success","timestamp":1487076708000,"props":{"args":[42],"payload":{}},"data":42},null,null]})</script>'
    );
  });
  it("should exclude instance from Provider by key", async () => {
    // given
    let ctx = {};
    function Test() {
      return (
        <div data-testid="parent">
          <Provider context={ctx}>
            <AsyncStateComponent
              config={{ key: "counter2", initialValue: 0 }}
            />
          </Provider>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );
    expect(screen.getByTestId("parent").innerHTML).toEqual("");
  });
  it("should exclude instance from Provider by state value", async () => {
    // given
    let ctx = {};
    createContext(ctx);
    let src = createSource("counter2", null, {
      initialValue: 14,
      context: ctx,
    });
    let src2 = createSource("counter3", null, {
      initialValue: 99,
      context: ctx,
    });
    function Test() {
      return (
        <div data-testid="parent">
          <Provider context={ctx}>
            <AsyncStateComponent config={src} />
            <AsyncStateComponent config={src2} />
          </Provider>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );
    expect(screen.getByTestId("parent").innerHTML).toEqual(
      '<script id="test">window.__ASYNC_STATES_HYDRATION_DATA__ = Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, {"__INSTANCE__counter2":{"state":{"status":"initial","data":14,"timestamp":1487076708000,"props":{"args":[14],"payload":{}}},"latestRun":null,"payload":{}}})</script>'
    );
  });
});
