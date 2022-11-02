import * as React from "react";
import {render} from "@testing-library/react";
import AsyncStateComponent from "../../utils/AsyncStateComponent";
import {createSource, Producer, ProducerProps} from "../../../../async-state";
import {AsyncStateProvider} from "../../../../react/AsyncStateProvider";

describe('should run another producer from producer', () => {
  it('should run producer by source', () => {
    // given
    const source1Producer = jest.fn().mockImplementation(() => 5);
    const source1 = createSource("source1", source1Producer);

    const source2Producer: Producer<number> = jest.fn().mockImplementation((props: ProducerProps<number>) => {
      props.run(source1, null, 2);
      return 3;
    });
    const source2 = createSource("source1", source2Producer);

    function Test() {


      return (
        <>
          <AsyncStateComponent config={{source: source1}}>
            {() => null}
          </AsyncStateComponent>
          <AsyncStateComponent config={{source: source2, lazy: false}}>
            {() => null}
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
    expect(source1Producer.mock.calls[0][0].args[0]).toBe(2);
  });
  it('should run producer by source inside provider', () => {
    // given
    const source1Producer = jest.fn().mockImplementation(() => 5);
    const source1 = createSource("source1", source1Producer);

    const source2Producer: Producer<number> = jest.fn().mockImplementation((props: ProducerProps<number>) => {
      props.run(source1, null, 1);
      return 3;
    });
    const source2 = createSource("source1", source2Producer);

    function Test() {


      return (
        <AsyncStateProvider>
          <AsyncStateComponent config={{source: source1}}>
            {() => null}
          </AsyncStateComponent>
          <AsyncStateComponent config={{source: source2, lazy: false}}>
            {() => null}
          </AsyncStateComponent>
        </AsyncStateProvider>
      );
    }

    // when

    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>)
    // then

    expect(source1Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(source2Producer).toHaveBeenCalledTimes(2); // 1 strict mode
    expect(source1Producer.mock.calls[0][0].args[0]).toBe(1);
  });
  it('should run producer by key', () => {
    // given
    const source2Producer = jest.fn().mockImplementation(() => 5);

    const source1Producer = jest.fn().mockImplementation((props: ProducerProps<number>) => {
      props.run("source2", null, 3);
      props.run("doesntExist", null, 3);
      return 3;
    });
    const source1 = createSource("source1", source1Producer);

    function Test() {


      return (
        <AsyncStateProvider initialStates={[source1, {
          key: "source2",
          producer: source2Producer,
          config: {}
        }]}>
          <AsyncStateComponent config={{source: source1, lazy: false}}>
            {() => null}
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
    expect(source2Producer.mock.calls[0][0].args[0]).toBe(3);
  });
  it('should run producer by function', () => {
    // given
    const source2Producer = jest.fn().mockImplementation(() => 5);

    const source1Producer = jest.fn().mockImplementation((props: ProducerProps<number>) => {
      props.run(source2Producer, {payload: {hello: "world"}}, 4);
      return 3;
    });
    const source1 = createSource("source1", source1Producer);

    function Test() {


      return (
        <AsyncStateComponent config={{source: source1, lazy: false}}>
          {() => null}
        </AsyncStateComponent>
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
    expect(source2Producer.mock.calls[0][0].args[0]).toBe(4);
    expect(source2Producer.mock.calls[0][0].payload).toEqual({hello: "world"});
  });
  it('should run producer by function inside provider', () => {
    // given
    const source2Producer = jest.fn().mockImplementation(() => 5);

    const source1Producer = jest.fn().mockImplementation((props: ProducerProps<number>) => {
      props.run(source2Producer, null, 5);
      return 3;
    });
    const source1 = createSource("source1", source1Producer);

    function Test() {

      return (
        <AsyncStateProvider>
          <AsyncStateComponent config={{source: source1, lazy: false}}>
            {() => null}
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
    expect(source2Producer.mock.calls[0][0].args[0]).toBe(5);
  });
});
