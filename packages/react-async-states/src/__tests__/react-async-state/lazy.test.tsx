import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { useAsync } from "../../hooks/useAsync_export";
import { createSource } from "async-states";

describe("should auto run async state", () => {
  it("should auto run -- sync with autoRunArgs", async () => {
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

  it("should auto run async with autoRunArgs", async () => {
    // given
    jest.useFakeTimers();

    function producer(props): Promise<string> {
      return new Promise<string>((resolve) => {
        let id = setTimeout(() => resolve(props.args[0]), 100);
        props.onAbort(() => {
          clearTimeout(id);
        });
      });
    }

    const mockedProducer = jest.fn().mockImplementation(producer);

    function Component() {
      const {
        state,
        dataProps: { args },
      } = useAsync.auto({
        initialValue: "init",
        autoRunArgs: ["Hello"],
        producer: mockedProducer,
      });

      return (
        <div>
          <span data-testid="status">{state.status}</span>
          <span data-testid="result">{state.data}</span>
          <span data-testid="args">{args[0]}</span>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    expect(screen.getByTestId("status").innerHTML).toEqual("pending");
    expect(screen.getByTestId("args").innerHTML).toEqual("init");

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    // then
    expect(screen.getByTestId("status").innerHTML).toEqual("success");
    expect(screen.getByTestId("args").innerHTML).toEqual("Hello");

    expect(screen.getByTestId("result").innerHTML).toEqual("Hello");
    expect(mockedProducer.mock.calls[0][0].args).toEqual(["Hello"]);
  });

  it("should auto run async with payload", async () => {
    // given
    jest.useFakeTimers();

    function producer(props): Promise<number> {
      return new Promise<number>((resolve) => {
        let id = setTimeout(() => resolve(props.payload.content), 100);
        props.onAbort(() => {
          clearTimeout(id);
        });
      });
    }

    const mockedProducer = jest.fn().mockImplementation(producer);

    function Component() {
      const { state, dataProps: {payload} } = useAsync.auto({
        payload: {
          content: "Hello",
        },
        producer: mockedProducer,
      });
      let content = payload?.content ?? "";

      return (
        <div>
          <span data-testid="status">{state.status}</span>
          <span data-testid="result">{state.data}</span>
          <span data-testid="payload">{String(content)}</span>
        </div>
      );
    }

    // when
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    expect(screen.getByTestId("status").innerHTML).toEqual("pending");
    expect(screen.getByTestId("payload").innerHTML).toEqual("");

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    // then
    expect(screen.getByTestId("status").innerHTML).toEqual("success");
    expect(screen.getByTestId("payload").innerHTML).toEqual("Hello");

    expect(screen.getByTestId("result").innerHTML).toEqual("Hello");
    expect(mockedProducer.mock.calls[0][0].payload).toEqual({
      content: "Hello",
    });
  });
  it("should not auto run when function returning false", async () => {
    // given
    let spy = jest.fn();
    let source = createSource("test-22", spy);
    function Component() {
      const { state } = useAsync.auto({
        source,
        condition: () => false,
      });

      return <span data-testid="status">{state.status}</span>;
    }

    // when
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByTestId("status").innerHTML).toEqual("initial");
  });
});
