import * as React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { getSource } from "async-states";
import Provider from "../../../provider/Provider";
import AsyncStateComponent from "../../utils/AsyncStateComponent";
import { flushPromises } from "../../utils/test-utils";
import { mockDateNow } from "../../utils/setup";

mockDateNow();
jest.mock("../../../provider/context", () => {
  return {
    ...jest.requireActual("../../../provider/context"),
    isServer: false,
  };
});

function BootHydration({ data }: { data: string }) {
  eval(data);
  return null;
  // return JSON.stringify(window.__ASYNC_STATES_HYDRATION_DATA__ ?? {}) as string
  // for some reason, <script> won't affect window
  // return <script dangerouslySetInnerHTML={{__html: data}}></script>
}

describe("should hydrate async states", () => {
  it("should perform basic Provider", async () => {
    // given
    let ctx = {};
    let hydrationScript =
      'window.__ASYNC_STATES_HYDRATION_DATA__ = Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, {"__INSTANCE__state-1":{"state":{"status":"success","data":42,"props":{"args":[42],"payload":{}},"timestamp":1487076708000},"payload":{}}})';

    function Test() {
      return (
        <div data-testid="parent">
          <Provider id="test" context={ctx}>
            <BootHydration data={hydrationScript} />
            <AsyncStateComponent config={{ key: "state-1" }} />
            <AsyncStateComponent config={{ key: "state-2" }} />
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

    let src = getSource("state-1", ctx)!;
    expect(src.getState().status).toBe("success");
    expect(src.getState().data).toBe(42);
    let src2 = getSource("state-2", ctx)!;
    expect(src2.getState().status).toBe("initial");
    expect(src2.getState().data).toBe(undefined);
  });
  it("should rehydrate due to some streaming html event", async () => {
    // given
    let ctx = {};
    let hydrationScript =
      'window.__ASYNC_STATES_HYDRATION_DATA__ = Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, {"__INSTANCE__state-1":{"state":{"status":"success","data":42,"props":{"args":[42],"payload":{}},"timestamp":1487076708000},"payload":{}}})';

    function Wrapper({ children }) {
      let [visible, setVisible] = React.useState(false);
      return (
        <>
          <button onClick={() => setVisible(true)} data-testid="toggle">
            toggle
          </button>
          {visible && children}
        </>
      );
    }

    function Test() {
      return (
        <div data-testid="parent">
          <Provider id="test" context={ctx}>
            <BootHydration data={hydrationScript} />
            <AsyncStateComponent config={{ key: "state-1" }} />
            <AsyncStateComponent config={{ key: "state-2" }} />
            <Wrapper>
              <Provider id="test" context={ctx}>
                <BootHydration data='window.__ASYNC_STATES_HYDRATION_DATA__ = Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, {"__INSTANCE__state-1":{"state":{"status":"success","data":43,"props":{"args":[42],"payload":{}},"timestamp":1487076708000},"payload":{}}})' />
              </Provider>
            </Wrapper>
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
    let src = getSource("state-1", ctx)!;
    expect(src.getState().status).toBe("success");
    expect(src.getState().data).toBe(42);
    fireEvent.click(screen.getByTestId("toggle"));
    await flushPromises();
    expect(src.getState().data).toBe(43);
  });
});
