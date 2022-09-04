import * as React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import {
  AsyncStateSubscriptionMode,
  UseAsyncState
} from "../../../../types.internal";
import {useAsyncState} from "../../../../react/useAsyncState";

describe('should add static payload to async state', () => {
  it('should add payload to standalone subscription ', async () => {
    // given
    function producer(props) {
      const {salt} = props.payload;
      return props.args[0] + salt;
    }

    const mockedProducer = jest.fn().mockImplementation(producer);

    function Component() {
      const {
        run,
        mode,
        state,
      }: UseAsyncState<number> = useAsyncState({
        initialValue: 0,
        payload: {
          salt: 5,
        },
        producer: mockedProducer,
      });

      function increment() {
        run(state.data + 1);
      }

      return (
        <div>
          <button data-testid="increment" onClick={increment}>increment</button>
          <span data-testid="mode">{mode}</span>
          <span data-testid="result">{state.data}</span>
        </div>);
    }

    // when

    render(
      <React.StrictMode>
        <Component/>
      </React.StrictMode>
    )

    const incrementBtn = screen.getByTestId("increment");
    // then
    expect(screen.getByTestId("mode").innerHTML)
      .toEqual(AsyncStateSubscriptionMode.OUTSIDE_PROVIDER);

    // +1
    fireEvent.click(incrementBtn);
    expect(mockedProducer).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("result").innerHTML).toEqual("6");
    expect(mockedProducer.mock.calls[0][0].payload).toEqual({salt: 5});

    fireEvent.click(incrementBtn);
    expect(screen.getByTestId("result").innerHTML).toEqual("12");
  });
});
