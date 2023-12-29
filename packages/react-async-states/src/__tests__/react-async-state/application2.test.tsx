import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import type { Api } from "../../application/types2";
import { createApplication2 } from "../../application/application2";
import { flushPromises } from "../utils/test-utils";

type User = {
  id: number;
  name: string;
};

let userSearch = async () => Promise.resolve({ id: 15, name: "incepter" });

// current: api<User, [], Error>({
//   eager: true,
//   producer: userSearch,
//   config: { runEffect: "debounce" },
// }),

type AppShape = {
  auth: {
    current: Api<User, [], Error>;
  };
  users: {
    search: Api<User, [string], Error>;
    findOne: Api<User, [string], Error>;
  };
};

describe("createApplication2 abstraction tests", () => {
  let originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it("should create the application with correct types", () => {
    let app = createApplication2<AppShape>(undefined, {});
    let authCurrent: Api<User, [], Error> = app.auth.current;
    let searchToken: Api<User, [string], Error> = app.users.search;
  });

  it("should throw if used without being injected", () => {
    let errorMessageToThrow =
      "Call app.users.search.define(producer) before using app.users.search";
    let app = createApplication2<AppShape>(undefined, {});
    expect(() => app.users.search()).toThrow(errorMessageToThrow);
    expect(() => app.users.search.useData()).toThrow(errorMessageToThrow);
    expect(() => app.users.search.useAsync()).toThrow(errorMessageToThrow);
    // the following was eager
    // expect(() => app.auth.current.useAsyncState()).not.toThrow(
    //   errorMessageToThrow
    // );
  });

  it("should be able to inject producer and configuration and then not throw", () => {
    let app = createApplication2<AppShape>(undefined, {});

    // should throw because it isn't injected yet
    expect(() => app.users.search()).toThrow(
      "Call app.users.search.define(producer) before using app.users.search"
    );
    app.users.search.define(userSearch, { skipPendingDelayMs: 400 });
    expect(app.users.search().getConfig()).toEqual({
      context: {},
      skipPendingDelayMs: 400,
    });
  });
  it("should reuse the same instance when injecting several times", () => {
    let app = createApplication2<AppShape>(undefined, {});

    let src = app.users.search.define(userSearch)();
    let src2 = app.users.search.define(userSearch)();
    expect(src).toBe(src2);
  });
  it("should subscribe to a created api in component using use (auto run)", async () => {
    let app = createApplication2<AppShape>(undefined, {});
    app.users.search.define(userSearch);

    function Component() {
      let { data } = app.users.search.useData({
        lazy: false,
        condition: (s) => s.status === "initial",
      });
      return <span data-testid="data">{data?.name}</span>;
    }

    render(
      <React.StrictMode>
        <React.Suspense fallback={<div data-testid="pending">pending</div>}>
          <Component />
        </React.Suspense>
      </React.StrictMode>
    );
    expect(screen.getByTestId("pending").innerHTML).toBe("pending");
    await act(async () => await flushPromises());
    expect(screen.getByTestId("data").innerHTML).toBe("incepter");
  });
  it("should subscribe to a created api in component using useAsyncState", async () => {
    let app = createApplication2<AppShape>(undefined, {});

    function Component() {
      let { state } = app.users.findOne.define(userSearch).useAsync();
      return <span data-testid="status">{state.status}</span>;
    }

    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );
    expect(screen.getByTestId("status").innerHTML).toBe("initial");
  });
});
