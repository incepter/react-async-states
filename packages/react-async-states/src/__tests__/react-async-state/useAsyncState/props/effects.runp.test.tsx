import * as React from "react";
import {act, render, screen} from "@testing-library/react";
import {
  Status, createSource,
  Producer,
  ProducerProps, Source
} from "@core";
import AsyncStateComponent from "../../utils/AsyncStateComponent";
import {AsyncStateProvider} from "../../../../Provider";
import {UseAsyncState} from "../../../../types.internal";
import {flushPromises} from "../../utils/test-utils";
import {mockDateNow, TESTS_TS} from "../../utils/setup";

mockDateNow();
describe('should runp another producer from producer', () => {
  jest.useFakeTimers();
  it('should runp producer by source', async () => {
    // given
    const source1Producer = jest.fn().mockImplementation(props => props.args[0]);
    const source1 = createSource("source1", source1Producer);

    const source2Producer: Producer<number> = jest.fn().mockImplementation((props: ProducerProps<number>) => {
      return props.runp(source1, null, 1)?.then(t => t.data);
    });
    const source2 = createSource("source1", source2Producer);

    function Test() {

      return (
        <>
          <AsyncStateComponent config={{source: source1}}>
            {() => null}
          </AsyncStateComponent>
          <AsyncStateComponent config={{source: source2, lazy: false}}>
            {({state}: UseAsyncState<number>) => (
              <div>
                <span data-testid="status">{state.status}</span>
                <span data-testid="result">{state.data ?? ""}</span>
              </div>
            )}
          </AsyncStateComponent>
        </>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    // then
    expect(source1Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(source2Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(screen.getByTestId("status").innerHTML)
      .toEqual(Status.pending);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByTestId("result").innerHTML).toEqual("1");
    expect(screen.getByTestId("status").innerHTML)
      .toEqual(Status.success);
    expect(source1Producer.mock.calls[0][0].args[0]).toBe(1);
  });
  it('should runp producer by source inside provider', async () => {
    // given
    const source1Producer = jest.fn().mockImplementation(props => props.args[0]);
    const source1 = createSource("source1", source1Producer);

    const source2Producer: Producer<number> = jest.fn().mockImplementation((props: ProducerProps<number>) => {
      return props.runp(source1, null, 2)?.then(t => t.data);
    });
    const source2 = createSource("source1", source2Producer);

    function Test() {

      return (
        <AsyncStateProvider>
          <AsyncStateComponent config={{source: source1}}>
            {() => null}
          </AsyncStateComponent>
          <AsyncStateComponent config={{source: source2, lazy: false}}>
            {({state}: UseAsyncState<number>) => (
              <div>
                <span data-testid="status">{state.status}</span>
                <span data-testid="result">{state.data ?? ""}</span>
              </div>
            )}
          </AsyncStateComponent>
        </AsyncStateProvider>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    // then
    expect(source1Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(source2Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(screen.getByTestId("status").innerHTML)
      .toEqual(Status.pending);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByTestId("result").innerHTML).toEqual("2");
    expect(screen.getByTestId("status").innerHTML)
      .toEqual(Status.success);
    expect(source1Producer.mock.calls[0][0].args[0]).toBe(2);
  });
  it('should runp producer by key', async () => {
    // given
    const source2Producer = jest.fn().mockImplementation(() => 3);

    type TestType = {
      source2Data: number,
      doesntExistData: any,
    }

    const source1Producer = jest.fn().mockImplementation(async (props: ProducerProps<TestType>) => {
      const source2Data = (await props.runp("source2", null, 3))?.data;
      const doesntExistData = (await props.runp("doesntExist", null, 3))?.data;
      return {source2Data, doesntExistData};
    });
    const source1 = createSource("source1", source1Producer) as Source<TestType>;

    function Test() {


      return (
        <AsyncStateProvider initialStates={[source1, {
          key: "source2",
          producer: source2Producer,
          config: {}
        }]}>
          <AsyncStateComponent config={{source: source1, lazy: false}}>
            {({state}) => (
              <span data-testid="result">{JSON.stringify(state)}</span>
            )}
          </AsyncStateComponent>
        </AsyncStateProvider>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    await act(async () => {
      await flushPromises();
    });

    // then
    expect(source1Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(source2Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(source2Producer.mock.calls[0][0].args[0]).toBe(3);
    expect(screen.getByTestId("result").innerHTML)
      .toEqual(JSON.stringify({
        "status": "success",
        "data": {"source2Data": 3},
        "props": {
          "lastSuccess": {"status": "initial", "timestamp": TESTS_TS,},
          "payload": {},
          "args": []
        },
        "timestamp": TESTS_TS,
      }));
  });
  it('should runp producer by function', async () => {
    // given
    const source2Producer = jest.fn().mockImplementation(() => 5);

    const source1Producer = jest.fn().mockImplementation(async (props: ProducerProps<number>) => {
      return (await props.runp(source2Producer, {payload: {hello: "world"}}, 4))?.data;
    });
    const source1 = createSource("source1", source1Producer);

    function Test() {
      return (
        <AsyncStateComponent config={{source: source1, lazy: false}}>
          {({state}: UseAsyncState<number>) => (
            <span data-testid="result">{state.data}</span>
          )}
        </AsyncStateComponent>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    await act(async () => {
      await flushPromises();
    });

    // then
    expect(source1Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(source2Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(source2Producer.mock.calls[0][0].args[0]).toBe(4);
    expect(source2Producer.mock.calls[0][0].payload).toEqual({hello: "world"});
    expect(screen.getByTestId("result").innerHTML).toEqual("5");
  });
  it('should runp producer by function inside provider', async () => {
    // given
    const source2Producer = jest.fn().mockImplementation(() => 7);

    const source1Producer = jest.fn().mockImplementation(async (props: ProducerProps<number>) => {
      return (await props.runp(source2Producer, null, 66))?.data;
    });
    const source1 = createSource("source1", source1Producer);

    function Test() {

      return (
        <AsyncStateProvider>
          <AsyncStateComponent config={{source: source1, lazy: false}}>
            {({state}: UseAsyncState<number>) => (
              <span data-testid="result">{state.data}</span>
            )}
          </AsyncStateComponent>
        </AsyncStateProvider>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    )

    await act(async () => {
      await flushPromises();
    });

    // then
    expect(source1Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(source2Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(source2Producer.mock.calls[0][0].args[0]).toBe(66);
    expect(screen.getByTestId("result").innerHTML).toEqual("7");
  });
});
