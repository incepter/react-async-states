import * as React from "react";
import {act, render, screen} from "@testing-library/react";
import {
  StateBoundary,
  useCurrentState
} from "../../../components/StateBoundary";
import {AsyncStateStatus, RenderStrategy} from "../../../async-state";
import {createSource} from "../../../helpers/create-async-state";
import {AsyncStateSubscriptionMode} from "../../../types.internal";
import {flushPromises} from "../utils/test-utils";

describe('StateBoundary', () => {
  it('should render in RenderThenFetch strategy', async () => {
    // given
    const source = createSource('test', async () => Promise.resolve(5));

    // when

    function Component() {
      const {mode, state} = useCurrentState();
      return (
        <div>
          <span data-testid="current-mode">{mode}</span>
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
      .toEqual(AsyncStateSubscriptionMode.SOURCE);
    expect(screen.getByTestId("current-status").innerHTML)
      .toEqual(AsyncStateStatus.pending);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByTestId("current-status").innerHTML)
      .toEqual(AsyncStateStatus.success);
  });
  it('should render in FetchThenRender strategy', async () => {
    // given
    const source = createSource('test', async () => Promise.resolve(5));

    // when

    function Component() {
      const {mode, state} = useCurrentState();
      return (
        <div>
          <span data-testid="current-mode">{mode}</span>
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
      .toEqual(AsyncStateSubscriptionMode.SOURCE);
    expect(screen.getByTestId("current-status").innerHTML)
      .toEqual(AsyncStateStatus.success);
  });
  it('should render in FetchAsYouRender strategy', async () => {
    // given
    const source = createSource('test', async () => Promise.resolve(5));

    // when

    function Component() {
      const {mode, state} = useCurrentState();
      return (
        <div>
          <span data-testid="current-mode">{mode}</span>
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
      .toEqual(AsyncStateStatus.success);
  });
});
