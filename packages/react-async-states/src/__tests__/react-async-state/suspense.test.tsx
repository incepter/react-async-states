import * as React from "react";
import { createSource, ProducerProps } from "async-states";
import { act, render, screen } from "@testing-library/react";
import { useData } from "../../hooks/useData_export";
import { flushPromises } from "../utils/test-utils";

// @ts-ignore
jest.useFakeTimers("modern");
describe("suspense", () => {
  async function fetchUserDetails({
    args: [id],
  }: ProducerProps<string, [string]>) {
    await new Promise((res) => setTimeout(res, 500));
    return id;
  }

  it("should suspend using useData and react to deps", async () => {
    let _setState;
    function Example() {
      const [userId, setUserId] = React.useState("");
      _setState = setUserId;
      const { data } = useData(
        {
          lazy: false,
          key: "user-details",
          autoRunArgs: [userId],
          producer: fetchUserDetails,
        },
        [userId]
      );

      return <div data-testid="result">{data}</div>;
    }
    function Test() {
      return (
        <React.Suspense fallback={<span data-testid="suspense">pending</span>}>
          <Example />
        </React.Suspense>
      );
    }
    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );
    expect(screen.getByTestId("suspense").innerHTML).toEqual("pending");
    await act(async () => {
      jest.advanceTimersByTime(500);
      await flushPromises();
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("");
    act(() => {
      _setState("new value");
    });
    expect(screen.getByTestId("suspense").innerHTML).toEqual("pending");
    await act(async () => {
      jest.advanceTimersByTime(500);
      await flushPromises();
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("new value");
    act(() => {
      _setState("another value");
    });
    expect(screen.getByTestId("suspense").innerHTML).toEqual("pending");
    await act(async () => {
      jest.advanceTimersByTime(500);
      await flushPromises();
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("another value");
    act(() => {
      React.startTransition(() => {
        _setState("another new value");
      });
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("another value");
    await act(async () => {
      jest.advanceTimersByTime(200);
      await flushPromises();
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("another value");
    await act(async () => {
      jest.advanceTimersByTime(300);
      await flushPromises();
    });
    expect(screen.getByTestId("result").innerHTML).toEqual("another new value");
  });
  it(
    "should suspend using useData and react to deps and play well " +
      "with multiple components",
    async () => {
      let _setState1;
      let _setState2;
      let _setState3;
      let source = createSource<string, [string]>("test-xx", fetchUserDetails);
      function Example1() {
        const [userId, setUserId] = React.useState("");
        _setState1 = setUserId;
        const { data } = useData(
          {
            source,
            lazy: false,
            autoRunArgs: [userId] as [string],
          },
          [userId]
        );
        return <div data-testid="result-1">{data}</div>;
      }
      function Example2() {
        const [userId, setUserId] = React.useState("");
        _setState2 = setUserId;
        const { data } = useData(
          {
            source,
            lazy: false,
            autoRunArgs: [userId] as [string],
          },
          [userId]
        );
        return <div data-testid="result-2">{data}</div>;
      }
      function Example3() {
        const [userId, setUserId] = React.useState("");
        _setState3 = setUserId;
        const { data } = useData(
          {
            source,
            lazy: false,
            autoRunArgs: [userId] as [string],
          },
          [userId]
        );
        return <div data-testid="result-3">{data}</div>;
      }
      function Test() {
        return (
          <React.Suspense
            fallback={<span data-testid="suspense">pending</span>}
          >
            <Example1 />
            <Example2 />
            <Example3 />
          </React.Suspense>
        );
      }

      render(
        <React.StrictMode>
          <Test />
        </React.StrictMode>
      );
      expect(screen.getByTestId("suspense").innerHTML).toEqual("pending");
      await act(async () => {
        jest.advanceTimersByTime(500);
        await flushPromises();
      });
      expect(screen.getByTestId("result-1").innerHTML).toEqual("");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("");
      act(() => {
        _setState1("other value");
      });
      expect(screen.getByTestId("suspense").innerHTML).toEqual("pending");
      await act(async () => {
        jest.advanceTimersByTime(500);
        await flushPromises();
      });
      expect(screen.getByTestId("result-1").innerHTML).toEqual("other value");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("other value");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("other value");
      act(() => {
        _setState2("another value");
      });
      expect(screen.getByTestId("suspense").innerHTML).toEqual("pending");
      await act(async () => {
        jest.advanceTimersByTime(500);
        await flushPromises();
      });
      expect(screen.getByTestId("result-1").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("another value");
      act(() => {
        React.startTransition(() => {
          _setState3("_new value");
        });
      });
      expect(screen.getByTestId("result-1").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("another value");
      await act(async () => {
        jest.advanceTimersByTime(200);
        await flushPromises();
      });
      expect(screen.getByTestId("result-1").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("another value");
      await act(async () => {
        jest.advanceTimersByTime(300);
        await flushPromises();
      });
      expect(screen.getByTestId("result-1").innerHTML).toEqual("_new value");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("_new value");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("_new value");
    }
  );
  it(
    "should suspend using useData and react to deps and play well " +
      "with multiple suspense boundaries",
    async () => {
      let _setState1;
      let _setState2;
      let _setState3;
      let source = createSource<string, [string]>("test-xxx", fetchUserDetails);
      function Example1() {
        const [userId, setUserId] = React.useState("");
        _setState1 = setUserId;
        const { data } = useData(
          {
            source,
            lazy: false,
            autoRunArgs: [userId] as [string],
          },
          [userId]
        );
        return <div data-testid="result-1">{data}</div>;
      }
      function Example2() {
        const [userId, setUserId] = React.useState("");
        _setState2 = setUserId;
        const { data } = useData(
          {
            source,
            lazy: false,
            autoRunArgs: [userId] as [string],
          },
          [userId]
        );
        return <div data-testid="result-2">{data}</div>;
      }
      function Example3() {
        const [userId, setUserId] = React.useState("");
        _setState3 = setUserId;
        const { data } = useData(
          {
            source,
            lazy: false,
            autoRunArgs: [userId] as [string],
          },
          [userId]
        );
        return <div data-testid="result-3">{data}</div>;
      }
      function Test() {
        return (
          <>
            <React.Suspense
              fallback={<span data-testid="suspense-1">pending</span>}
            >
              <Example1 />
              <Example2 />
            </React.Suspense>
            <React.Suspense
              fallback={<span data-testid="suspense-2">pending</span>}
            >
              <Example3 />
            </React.Suspense>
          </>
        );
      }

      render(
        <React.StrictMode>
          <Test />
        </React.StrictMode>
      );
      expect(screen.getByTestId("suspense-1").innerHTML).toEqual("pending");
      expect(screen.getByTestId("suspense-2").innerHTML).toEqual("pending");
      await act(async () => {
        jest.advanceTimersByTime(500);
        await flushPromises();
      });
      expect(screen.getByTestId("result-1").innerHTML).toEqual("");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("");
      act(() => {
        _setState1("other value");
      });
      expect(screen.getByTestId("suspense-1").innerHTML).toEqual("pending");
      // expect(screen.getByTestId("suspense-2").innerHTML).toEqual("pending");
      await act(async () => {
        jest.advanceTimersByTime(500);
        await flushPromises();
      });
      // screen.debug()
      expect(screen.getByTestId("result-1").innerHTML).toEqual("other value");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("other value");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("other value");

      act(() => {
        _setState2("another value");
      });
      expect(screen.getByTestId("suspense-1").innerHTML).toEqual("pending");
      await act(async () => {
        jest.advanceTimersByTime(500);
        await flushPromises();
      });
      expect(screen.getByTestId("result-1").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("another value");
      act(() => {
        React.startTransition(() => {
          _setState3("_new value");
        });
      });
      expect(screen.getByTestId("result-1").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("another value");
      await act(async () => {
        jest.advanceTimersByTime(200);
        await flushPromises();
      });
      expect(screen.getByTestId("result-1").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("another value");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("another value");
      await act(async () => {
        jest.advanceTimersByTime(300);
        await flushPromises();
      });
      expect(screen.getByTestId("result-1").innerHTML).toEqual("_new value");
      expect(screen.getByTestId("result-2").innerHTML).toEqual("_new value");
      expect(screen.getByTestId("result-3").innerHTML).toEqual("_new value");
    }
  );

  it("should read from cache and not suspend and inform other subcsriptions", async () => {
    let _setState1;
    let example1Render = 0;
    let example2Render = 0;
    let source = createSource<string, [string]>("test-4", fetchUserDetails, {
      cacheConfig: {
        enabled: true,
        hash: (args) => args![0],
        load() {
          return {
            "1": {
              deadline: 99999,
              addedAt: Date.now(),
              state: {
                status: "success",
                data: "cached_data",
                timestamp: Date.now(),
                props: { args: ["1"], payload: {} },
              },
            },
          };
        },
      },
    });
    function Example1() {
      example1Render += 1;
      const [userId, setUserId] = React.useState("");
      _setState1 = setUserId;
      const { data } = useData(
        {
          source,
          lazy: false,
          autoRunArgs: [userId] as [string],
        },
        [userId]
      );
      return <div data-testid="result-1">{data}</div>;
    }
    function Example2() {
      example2Render += 1;
      const { data } = useData(source);
      return <div data-testid="result-2">{data}</div>;
    }
    function Test() {
      return (
        <React.Suspense
          fallback={<span data-testid="suspense-1">pending</span>}
        >
          <Example2 />
          <Example1 />
        </React.Suspense>
      );
    }

    render(
      <React.StrictMode>
        <Test />
      </React.StrictMode>
    );
    expect(example2Render).toBe(2); // strict mode too
    expect(example1Render).toBe(1); // suspended
    example1Render = 0;
    example2Render = 0;
    expect(screen.getByTestId("suspense-1").innerHTML).toEqual("pending");
    await act(async () => {
      jest.advanceTimersByTime(500);
      await flushPromises();
    });
    expect(example1Render).toBe(2); // strict mode too
    expect(example2Render).toBe(2); // strict mode too
    example1Render = 0;
    example2Render = 0;
    expect(screen.getByTestId("result-1").innerHTML).toEqual("");
    expect(screen.getByTestId("result-2").innerHTML).toEqual("");

    act(() => {
      _setState1("1");
    });
    await act(async () => {
      // microtask won't tick without advancing (using 0)
      jest.advanceTimersByTime(0);
      await flushPromises();
    });
    expect(example1Render).toBe(2); // strict mode too
    expect(example2Render).toBe(2); // strict mode too
    expect(screen.getByTestId("result-2").innerHTML).toEqual("cached_data");
    expect(screen.getByTestId("result-1").innerHTML).toEqual("cached_data");
  });
});
