import * as React from "react";
import {act, render, screen} from "@testing-library/react";
import {
  RenderStrategy,
  StateBoundary,
  useCurrentState
} from "../../../StateBoundary";
import {
  Status,
  createSource
} from "async-states-core";
import {flushPromises} from "../utils/test-utils";

describe('StateBoundary', () => {
  it('should render in RenderThenFetch strategy', async () => {
    // given
    const source = createSource('test', async () => Promise.resolve(5));

    // when

    function Component() {
      const {devFlags, state} = useCurrentState();
      return (
        <div>
          <span data-testid="current-mode">{JSON.stringify(devFlags)}</span>
          <span data-testid="current-status">{state.status}</span>
        </div>
      );
    }

    render(
      <React.StrictMode>
        <StateBoundary strategy={RenderStrategy.RenderThenFetch}
                       config={source}>
          <Component/>
        </StateBoundary>
      </React.StrictMode>
    )

    // then
    expect(screen.getByTestId("current-mode").innerHTML)
      .toEqual("[\"CONFIG_SOURCE\",\"SOURCE\",\"AUTO_RUN\"]");
    expect(screen.getByTestId("current-status").innerHTML)
      .toEqual(Status.pending);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByTestId("current-status").innerHTML)
      .toEqual(Status.success);
  });
  it('should render in FetchThenRender strategy', async () => {
    // given
    const source = createSource('test', async () => Promise.resolve(5));

    // when

    function Component() {
      const {devFlags, state} = useCurrentState();
      return (
        <div>
          <span data-testid="current-mode">{JSON.stringify(devFlags)}</span>
          <span data-testid="current-status">{state.status}</span>
        </div>
      );
    }

    render(
      <React.StrictMode>
        <div data-testid="parent">
          <StateBoundary strategy={RenderStrategy.FetchThenRender}
                         config={source}>
            <Component/>
          </StateBoundary>
        </div>
      </React.StrictMode>
    )

    // then
    expect(screen.getByTestId("parent").innerHTML)
      .toEqual("");

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByTestId("current-mode")?.innerHTML)
      .toEqual("[\"CONFIG_SOURCE\",\"SOURCE\"]");
    expect(screen.getByTestId("current-status").innerHTML)
      .toEqual(Status.success);
  });
  it('should render in FetchAsYouRender strategy', async () => {
    // given
    const source = createSource('test', async () => Promise.resolve(5));

    // when

    function Component() {
      const {devFlags, state} = useCurrentState();
      return (
        <div>
          <span data-testid="current-mode">{JSON.stringify(devFlags)}</span>
          <span data-testid="current-status">{state.status}</span>
        </div>
      );
    }

    render(
      <React.StrictMode>
        <React.Suspense
          fallback={<div data-testid="suspense-fallback">Loading</div>}>
          <StateBoundary strategy={RenderStrategy.FetchAsYouRender}
                         config={source}>
            <Component/>
          </StateBoundary>
        </React.Suspense>
      </React.StrictMode>
    )

    // then
    expect(screen.getByTestId("suspense-fallback").innerHTML)
      .toEqual("Loading");

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByTestId("current-status").innerHTML)
      .toEqual(Status.success);
  });
});
