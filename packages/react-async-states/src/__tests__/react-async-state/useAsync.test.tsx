import * as React from "react";
import { render, screen } from "@testing-library/react";
import { useAsync } from "../../hooks/useAsync_export";

describe("useAsync", () => {
  it("API exists", () => {
    // given
    function producer(props): number {
      return props.args[0] ?? 0;
    }

    function Component() {
      const { state } = useAsync.auto<number, any, any>({
        producer,
        autoRunArgs: [5],
        initialValue: 99,
      });

      return <span data-testid="result">{state.data}</span>;
    }

    // when
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("5");
  });
});
