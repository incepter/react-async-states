import * as React from "react";
import { render } from "@testing-library/react";
import { createSource } from "async-states";
import { useAsync } from "../../../hooks/useAsync_export";
import { useData } from "../../../hooks/useData_export";
import { createApplication } from "../../../application/Application";
import { Api } from "../../../application/types";

describe("caller name", () => {
  it("useAsync - should correctly report the caller name", async () => {
    // given
    let source = createSource<number, any, any[]>("test-1", null, {
      initialValue: 0,
    });

    type Shape = {
      test: {
        caller: Api<number>;
      };
    };
    let app = createApplication<Shape>();
    app.test.caller.define(() => 5);
    let testSource = app.test.caller.source;

    let rendersCount = 0;
    // the caller name should be Test
    function Test() {
      useData(source);
      useAsync(source);
      useAsync.auto(source);
      app.test.caller.useData();
      app.test.caller.useAsync();

      rendersCount += 1;
      return null;
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );

    // then
    let subscriptionKeys = Object.values(source.inst.subscriptions!).map(
      (t) => t.props.key
    );

    let testSrcSubscriptionKeys = Object.values(
      testSource.inst.subscriptions!
    ).map((t) => t.props.key);

    expect(subscriptionKeys.length).toBe(3);

    subscriptionKeys.forEach((t) => {
      expect(t!.startsWith("Test-")).toBeTruthy();
    });

    expect(testSrcSubscriptionKeys.length).toBe(2);
    testSrcSubscriptionKeys.forEach((t) => {
      expect(t!.startsWith("Test-")).toBeTruthy();
    });

    // there a useAsync.auto that will change the state and thus rerender
    // in prod, we ll have only two renders, but in strict mode both are twice
    expect(rendersCount).toBe(4); // strict mode
  });
});
