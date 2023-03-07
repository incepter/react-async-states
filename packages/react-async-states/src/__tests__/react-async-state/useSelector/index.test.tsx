import * as React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {useSelector} from "../../../useSelector";
import {createSource} from "async-states";

describe('useSelector', () => {
  it('should do basic selection', () => {
    // given

    const dataSource = createSource<string, any, any>("data", null, {
      initialValue: "hello!",
      resetStateOnDispose: true
    });

    function Component() {
      const data = useSelector("data", d => d!.data as string);
      return <span data-testid="result">{data}</span>
    }

    function Test() {
      return (
        <Component/>
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
      const data = useSelector("data", d => d!.data as string);
      return <span data-testid="result">{data}</span>
    }

    const oldError = console.error;
    console.error = () => {
    };
    expect(() => render(
      <React.StrictMode>
        <Component/>
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
        <>
          <Component/>
        </>
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
        <Test/>
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

    const dataSource = createSource("data1", producer, {
      initialValue: "hello!",
      resetStateOnDispose: true
    });
    const dataSource2 = createSource("data12", null, {
      initialValue: "hello!!",
      resetStateOnDispose: true
    });

    function Component() {
      const data = useSelector(
        ["data1", "data12"],
        (data1, data2) => `${data1?.data}-${data2?.data}`
      );

      return (
        <div>
          <button data-testid="run" onClick={() => dataSource.run("update")}>run
          </button>
          <span data-testid="result">{data}</span>
        </div>
      );
    }

    function Test() {
      return (
        <Component/>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Test/>
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
    const dataSource = createSource("data11", null, {initialValue: "hello!"});
    const dataSource2 = createSource("data112", null, {initialValue: "hello!!"});

    function Component() {
      const data = useSelector(
        allKeys => allKeys.filter(t => t === "data11"),
        ({data11: state}) => state!.data,
      );
      return <span data-testid="result">{data}</span>
    }

    function Test() {
      return (
        <>
          <Component/>
        </>
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
});
