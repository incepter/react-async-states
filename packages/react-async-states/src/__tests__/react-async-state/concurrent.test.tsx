import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { useAsync } from "../../hooks/useAsync_export";
import { Status } from "async-states";
import { flushPromises } from "../utils/test-utils";

describe("useAsync with concurrent", () => {
  it("should suspend on initial and pending status and go to success", async () => {
    jest.useFakeTimers();
    function Component() {
      const { state, source } = useAsync({
        lazy: false,
        concurrent: true,
        key: "test-success",
        producer: () => new Promise<number>((res) => res(15)),
      });
      if (state.status !== "success") {
        throw new Error(`Illegal state ${state.status}`);
      }

      return <span data-testid="data">{state.data}</span>;
    }

    // when
    render(
      <React.StrictMode>
        <React.Suspense fallback={<span data-testid="suspense">pending</span>}>
          <Component />
        </React.Suspense>
      </React.StrictMode>
    );

    expect(screen.getByTestId("suspense").innerHTML).toBe("pending");
    await act(async () => {
      await flushPromises();
    });
    expect(screen.getByTestId("data").innerHTML).toBe("15");
  });
  it("should suspend on initial and pending status and go to error", async () => {
    jest.useFakeTimers();
    function Component() {
      const { state } = useAsync<unknown, never, number>({
        lazy: false,
        concurrent: true,
        key: "test-error",
        producer: () => new Promise<any>((_, rej) => rej(17)),
      });

      if (state.status !== "error") {
        throw new Error(`Illegal state ${state.status}`);
      }

      return <span data-testid="data">{state.data}</span>;
    }

    // when
    render(
      <React.StrictMode>
        <React.Suspense fallback={<span data-testid="suspense">pending</span>}>
          <Component />
        </React.Suspense>
      </React.StrictMode>
    );

    expect(screen.getByTestId("suspense").innerHTML).toBe("pending");
    await act(async () => {
      await flushPromises();
    });
    expect(screen.getByTestId("data").innerHTML).toBe("17");
  });
});
