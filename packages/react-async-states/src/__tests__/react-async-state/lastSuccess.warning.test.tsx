import * as React from "react";
import { render, screen } from "@testing-library/react";
import { createSource } from "async-states";
import { useAsync } from "../../hooks/useAsync_export";

describe("lastSuccess deprecation warning", () => {
  it("should warn once when lastSuccess is used", async () => {
    let originalConsoleError = console.error;
    let consoleErrorSpy = (console.error = jest.fn());

    let source = createSource("test-1", null, { initialValue: 1 });

    // given
    function Test() {
      // @ts-expect-error lastSuccess is deprecated
      let { lastSuccess } = useAsync(source);
      return <div data-testid="result">{lastSuccess.data}</div>;
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );

    // the warning should only be printed once

    // in strict mode, everything is twice
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("result").innerHTML).toBe("1");

    let expectedDeprecationWarning =
      "[Warning]: lastSuccess is deprecated in favor of useAsync().data. In practice, we only use the data attributefrom the lastSuccess. Used in component: Test";

    expect(consoleErrorSpy.mock.calls[0][0]).toBe(expectedDeprecationWarning);
    expect(consoleErrorSpy.mock.calls[1][0]).toBe(expectedDeprecationWarning);

    console.error = originalConsoleError;
  });
});
