import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {AsyncStateProvider} from "../../../Provider";
import {useSelector} from "../../../useSelector";
import {useRun} from "../../../useRun";
import {createSource} from "async-states-core";

describe('useSelector', () => {
  it('should do basic selection', () => {
    // given

    const dataSource = createSource("data", null, {initialValue: "hello!"});

    function Component() {
      const data = useSelector("data", d => d!.data);
      return <span data-testid="result">{data}</span>
    }

    function Test() {
      return (
        <AsyncStateProvider initialStates={[dataSource]}>
          <Component/>
        </AsyncStateProvider>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
      </React.StrictMode>
    );

    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("hello!");
  });
  it('should not throw when not in provider', () => {
    // given

    function Component() {
      const data = useSelector("data", d => d!.data);
      return <span data-testid="result">{data}</span>
    }

    const oldError = console.error;
    console.error = () => {
    };
    expect(() => render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    ))
      .not
      .toThrow("to use useSelector you must be inside a <AsyncStateProvider/>");
    console.error = oldError;
  });
  it('should throw when no keys', () => {
    // given
    function Test() {
      return (
        <AsyncStateProvider>
          <Component/>
        </AsyncStateProvider>
      );
    }

    function Component() {
      const data = useSelector([], d => d?.data);
      return <span data-testid="result">{data}</span>;
    }

    const oldError = console.error;
    console.error = () => {
    };
    expect(() => render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    ))
      .not
      .toThrow("A selector cannot have 0 watched keys.");
    console.error = oldError;
  });
  it('should do multiple selection', () => {
    // given

    function producer(props) {
      return props.args[0];
    }

    const dataSource = createSource("data", producer, {initialValue: "hello!"});
    const dataSource2 = createSource("data2", null, {initialValue: "hello!!"});

    function Component() {
      const data = useSelector(
        ["data", "data2"],
        (data1, data2) => `${data1?.data}-${data2?.data}`
      );
      const run = useRun();


      return (
        <div>
          <button data-testid="run" onClick={() => run("data", "update")}>run
          </button>
          <span data-testid="result">{data}</span>
        </div>
      );
    }

    function Test() {
      return (
        <AsyncStateProvider initialStates={[dataSource, dataSource2]}>
          <Component/>
        </AsyncStateProvider>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );

    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("hello!-hello!!");
    act(() => {
      fireEvent.click(screen.getByTestId("run"));
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("update-hello!!");
  });
  it('should select by function', () => {
    // given
    const dataSource = createSource("data", null, {initialValue: "hello!"});
    const dataSource2 = createSource("data2", null, {initialValue: "hello!!"});

    function Component() {
      const data = useSelector(
        allKeys => allKeys.filter(t => t === "data"),
        ({data: state}) => state!.data,
      );
      return <span data-testid="result">{data}</span>
    }

    function Test() {
      return (
        <AsyncStateProvider initialStates={[dataSource, dataSource2]}>
          <Component/>
        </AsyncStateProvider>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );

    // then
    expect(screen.getByTestId("result").innerHTML).toEqual("hello!");
  });
});
