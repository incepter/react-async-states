import * as React from "react";
import { render } from "@testing-library/react";
import { createSource } from "async-states";
import { useAsync } from "../../../hooks/useAsync_export";
import { useData } from "../../../hooks/useData_export";
import internalUse from "../../../application/internalUse";
import { api, createApplication } from "../../../application/Application";

describe("caller name", () => {
  it("useAsync - should correctly report the caller name", async () => {
    // given
    let source = createSource<number, any, any[]>("test-1", null, {
      initialValue: 0,
    });

    let shape = {
      test: {
        caller: api<number>({ eager: true, producer: () => 5 }),
      },
    };
    let app = createApplication<typeof shape>(shape);
    let testSource = app.test.caller();

    let rendersCount = 0;
    // the caller name should be Test
    function Test() {
      useData(source);
      useAsync(source);
      internalUse(source);
      useAsync.auto(source);
      app.test.caller.use();
      app.test.caller.useAsyncState();

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

    expect(subscriptionKeys.length).toBe(4);
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
