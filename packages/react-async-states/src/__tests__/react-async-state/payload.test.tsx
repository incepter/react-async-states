import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useAsync } from "../../hooks/useAsync_export";

describe("should add static payload to async state", () => {
  it("should add payload to standalone subscription ", async () => {
    // given
    function producer(props) {
      const { salt } = props.payload;
      return props.args[0] + salt;
    }

    const mockedProducer = jest.fn().mockImplementation(producer);

    function Component() {
      const {
        source: { run },
        state,
      } = useAsync<number, [number], any>({
        initialValue: 0,
        payload: {
          salt: 5,
        },
        producer: mockedProducer,
      });

      function increment() {
        run(state.data! + 1);
      }

      return (
        <div>
          <button data-testid="increment" onClick={increment}>
            increment
          </button>
          <span data-testid="result">{state.data}</span>
        </div>
      );
    }

    // when

    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    const incrementBtn = screen.getByTestId("increment");
    // then

    // +1
    fireEvent.click(incrementBtn);
    expect(mockedProducer).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("result").innerHTML).toEqual("6");
    expect(mockedProducer.mock.calls[0][0].payload).toEqual({ salt: 5 });

    fireEvent.click(incrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("12");
  });
});
