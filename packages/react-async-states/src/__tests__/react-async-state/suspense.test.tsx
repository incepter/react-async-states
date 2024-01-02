import * as React from "react";
import { getSource, ProducerProps } from "async-states";
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
      // console.log(
      //   "render !!",
      //   userId,
      //   getSource("user-details")?.getState().status
      // );
      const { data } = useData(
        {
          lazy: false,
          key: "user-details",
          // condition: !!userId,
          autoRunArgs: [userId],
          producer: fetchUserDetails,
        },
        [userId]
      );
      // console.log('render complete')

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
      // <React.StrictMode>
        <Test />
      // </React.StrictMode>
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

  });
});
