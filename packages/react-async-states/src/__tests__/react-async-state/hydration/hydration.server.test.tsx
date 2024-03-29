import * as React from "react";
import { render, screen } from "@testing-library/react";
import Provider, { HydrationComponent } from "../../../provider/Provider";
import { createContext, createSource } from "async-states";
import { mockDateNow } from "../../utils/setup";
import AsyncStateComponent from "../../utils/AsyncStateComponent";

mockDateNow();
jest.mock("../../../Provider/context", () => {
  return {
    ...jest.requireActual("../../../Provider/context"),
    isServer: true,
  };
});

// in the server there is only one pass, so for these tests there is no "strict mode"
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
    render(<Test />);

    expect(screen.getByTestId("parent").innerHTML).toEqual(
      '<script id="$$as-:r1:">var win=window;win["__$$"]=Object.assign(win["__$$"]||{},{"counter":[{"status":"initial","data":0,"timestamp":1487076708000,"props":{"args":[0],"payload":{}}},null,null]});win["__$$_H"]&&win["__$$_H"]();</script>'
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
    render(<Test />);
    expect(screen.getByTestId("parent").innerHTML).toEqual(
      '<script id="$$as-:r3:">var win=window;win["__$$"]=Object.assign(win["__$$"]||{},{"state-1":[{"status":"success","timestamp":1487076708000,"props":{"args":[42],"payload":{}},"data":42},null,null]});win["__$$_H"]&&win["__$$_H"]();</script>'
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
    render(<Test />);
    expect(screen.getByTestId("parent").innerHTML).toEqual("");
  });
});
