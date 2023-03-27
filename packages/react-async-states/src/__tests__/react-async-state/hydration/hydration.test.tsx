import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import Hydration from "../../../hydration/Hydration";
import AsyncStateComponent from "../utils/AsyncStateComponent";
import {mockDateNow} from "../utils/setup";

mockDateNow();
jest.mock("../../../hydration/context", () => {
  return {
    ...jest.requireActual("../../../hydration/context"),
    isServer: true,
  }
})
describe('should hydrate async states', () => {
  it('should perform basic hydration', async () => {
    // given
    let ctx = {}
    function Test() {
      return (
        <div data-testid="parent">
          <Hydration context={ctx}>
            <AsyncStateComponent config={{key: "counter", initialValue: 0}} />
          </Hydration>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )
    expect(screen.getByTestId("parent").innerHTML).toEqual(
      '<script>window.__ASYNC_STATES_HYDRATION_DATA__ = Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, {"ASYNC-STATES-default-POOL__INSTANCE__counter":{"state":{"status":"initial","data":0,"props":null,"timestamp":1487076708000},"payload":{}}})</script>');
  });
  it('should exclude instance from hydration by key', async () => {
    // given
    let ctx = {}
    function Test() {
      return (
        <div data-testid="parent">
          <Hydration exclude={(key) => key === "counter2"} context={ctx}>
            <AsyncStateComponent config={{key: "counter2", initialValue: 0}} />
          </Hydration>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )
    expect(screen.getByTestId("parent").innerHTML).toEqual('');
  });
  it('should exclude instance from hydration by state value', async () => {
    // given
    let ctx = {}
    function Test() {
      return (
        <div data-testid="parent">
          <Hydration exclude={(key, state) => state.data === 99} context={ctx}>
            <AsyncStateComponent config={{key: "counter2", initialValue: 14}} />
            <AsyncStateComponent config={{key: "counter3", initialValue: 99}} />
          </Hydration>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )
    expect(screen.getByTestId("parent").innerHTML).toEqual(
      '<script>window.__ASYNC_STATES_HYDRATION_DATA__ = Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, {"ASYNC-STATES-default-POOL__INSTANCE__counter2":{"state":{"status":"initial","data":14,"props":null,"timestamp":1487076708000},"payload":{}}})</script>');
  });
});
