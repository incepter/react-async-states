import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {createSource} from "../../../../../helpers/create-async-state";
import {UseAsyncState} from "../../../../../types.internal";
import {useAsyncState} from "../../../../../hooks/useAsyncState";

describe('should subscribe to a module level source object', () => {
  it('should share state by source between two components', () => {
    // given
    const source = createSource<number>(
      "counter",
      null,
      {initialValue: 0}
    );

    function Component({source, alias}) {
      const {state}: UseAsyncState<number> = useAsyncState(source);

      return <span data-testid={`count-${alias}`}>{state.data}</span>;
    }

    function Controls() {
      const {run}: UseAsyncState<number> = useAsyncState(source);

      return (
        <div>
          <button data-testid="increment"
                  onClick={() => run(old => old.data + 1)}>increment
          </button>
          <button data-testid="decrement"
                  onClick={() => run(old => old.data - 1)}>decrement
          </button>
        </div>
      );
    }

    function Test() {
      return (
        <>
          <Controls/>
          <Component source={source} alias="a"/>
          <Component source={source} alias="b"/>
        </>
      );
    }

    // when
    jest.useFakeTimers();
    render(<Test />);
    const incrementBtn = screen.getByTestId("increment");
    const decrementBtn = screen.getByTestId("decrement");
    // then

    expect(screen.getByTestId("count-a").innerHTML).toEqual("0");
    expect(screen.getByTestId("count-b").innerHTML).toEqual("0");

    fireEvent.click(incrementBtn);


    expect(screen.getByTestId("count-a").innerHTML).toEqual("1");
    expect(screen.getByTestId("count-b").innerHTML).toEqual("1");

    fireEvent.click(decrementBtn);


    expect(screen.getByTestId("count-a").innerHTML).toEqual("0");
    expect(screen.getByTestId("count-b").innerHTML).toEqual("0");
  });
});
