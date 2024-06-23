import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import type { Api } from "../../application/types";
import { createApplication } from "../../application/Application";
import { flushPromises } from "../utils/test-utils";

type User = {
  id: number;
  name: string;
};

let userSearch = async () => Promise.resolve({ id: 15, name: "incepter" });

type AppShape = {
  auth: {
    current: Api<User, []>;
  };
  users: {
    search: Api<User, [string]>;
    findOne: Api<User, [string]>;
  };
};

describe("createApplication abstraction tests", () => {
  let originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it("should create the application with correct types", () => {
    let app = createApplication<AppShape>(undefined, {});
    let authCurrent: Api<User, [], Error> = app.auth.current;
    let searchToken: Api<User, [string], Error> = app.users.search;
  });

  it("should throw if used without being injected", () => {
    let errorMsg = (name: string) =>
      `Call app.${name}.define(producer, config?) before using app.${name}`;
    let app = createApplication<AppShape>(undefined, {});
    expect(() => app.users.search.source).toThrow(errorMsg("users.search"));
    expect(() => app.users.search.useData()).toThrow("users.search");
    expect(() => app.users.search.useAsync()).toThrow("users.search");
    expect(() => app.auth.current.useAsync()).toThrow("auth.current");
    // the following was eager
    app.auth.current.define(userSearch, { runEffect: "debounce" });
    // this throws an Invalid Hook Call
    expect(() => app.auth.current.useAsync()).not.toThrow(
      errorMsg("auth.current")
    );
  });

  it("should be able to inject producer and configuration and then not throw", () => {
    let app = createApplication<AppShape>(undefined, {});

    // should throw because it isn't injected yet
    expect(() => app.users.search.source).toThrow(
      "Call app.users.search.define(producer, config?) before using app.users.search"
    );
    app.users.search.define(userSearch, { skipPendingDelayMs: 400 });
    expect(app.users.search.source.getConfig()).toEqual({
      context: {},
      skipPendingDelayMs: 400,
    });
  });
  it("should reuse the same instance when injecting several times", () => {
    let app = createApplication<AppShape>(undefined, {});

    let src = app.users.search.define(userSearch)();
    let src2 = app.users.search.define(userSearch).source;
    expect(src).toBe(src2);
  });
  it("should subscribe to a created api in component using use (auto run)", async () => {
    let app = createApplication<AppShape>(undefined, {});
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
    let app = createApplication<AppShape>(undefined, {});

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
