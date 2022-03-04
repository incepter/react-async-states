import * as React from "react";
import {render, screen} from "@testing-library/react";
import {createSource} from "../../../../../helpers/create-async-state";
import AsyncStateComponent from "../../../utils/AsyncStateComponent";
import {UseAsyncState} from "../../../../../types.internal";
import {AsyncStateStatus} from "../../../../../async-state";

describe('should post subscribe', () => {
  it('should invoke post subscribe when present', async () => {
    // given
    const producer = jest.fn().mockImplementation(props => props.args[0]);
    const counterSource = createSource("counter", producer, {initialValue: 0});

    const mocked = jest.fn();
    const postSubscribe = jest.fn().mockImplementation(({
      run,
      mode,
      getState
    }) => {
      mocked(getState());
      run("hourray!");
    });
    const config = {
      postSubscribe,
      source: counterSource,
    };

    function Test() {
      return (
        <AsyncStateComponent config={config}>
          {({state}: UseAsyncState<number>) => (
            <span data-testid="result">{state.data}</span>
          )}
        </AsyncStateComponent>
      );
    }

    // when
    render(<Test/>);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(producer).toHaveBeenCalledTimes(1);
    expect(postSubscribe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("result").innerHTML).toEqual("hourray!");
    expect(mocked).toHaveBeenCalledWith({
      status: AsyncStateStatus.initial,
      props: null,
      data: 0
    });
  });

});
