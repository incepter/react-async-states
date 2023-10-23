import * as React from "react";
import {act, render, screen} from "@testing-library/react";
import {api, createApplication, Token} from "../../application/Application";
import {RunEffect} from "async-states";
import {flushPromises} from "../utils/test-utils";

type User = {
  id: number,
  name: string,
}

let userSearch = async () => Promise.resolve({id: 15, name: "incepter"})

let testShape = {
  auth: {
    current: api<User, Error, "reason", []>({
      eager: true,
      producer: userSearch,
      config: {runEffect: "debounce"}
    })
  },
  users: {
    search: api<User, Error, never, [string]>(),
    findOne: api<User, Error, never, [string]>()
  }
}

describe('createApplication abstraction tests', () => {
  let originalConsoleError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalConsoleError
  })

  it('should create the application with correct types', () => {
    let app = createApplication<typeof testShape>(testShape)
    let authCurrent: Token<User, Error, "reason", []> = app.auth.current;
    let searchToken: Token<User, Error, never, [string]> = app.users.search;
  });

  it('should throw if used without being injected', () => {
    let expectedThrownErrorMessage = "Must call app.users.search.inject(producer)"
      + " before calling app.users.search() or app.users.search.use()"
    let app = createApplication<typeof testShape>(testShape)
    expect(() => app.users.search()).toThrow(expectedThrownErrorMessage)
    expect(() => app.users.search.use()).toThrow(expectedThrownErrorMessage)
    expect(() => app.users.search.useAsyncState()).toThrow(expectedThrownErrorMessage)
    // the following was eager
    expect(() => app.auth.current.useAsyncState()).not.toThrow(expectedThrownErrorMessage)
  });

  it('should be able to inject producer and configuration and then not throw', () => {
    let app = createApplication<typeof testShape>(testShape)

    // should throw because it isn't injected yet
    expect(() => app.users.search()).toThrow(
      "Must call app.users.search.inject(producer)"
      + " before calling app.users.search() or app.users.search.use()"
    )
    app.users.search.inject(userSearch, {skipPendingDelayMs: 400})
    expect(app.users.search().getConfig()).toEqual({skipPendingDelayMs: 400})
  });
  it('should reuse the same instance when injecting several times', () => {
    let app = createApplication<typeof testShape>(testShape)

    let src = app.users.search.inject(userSearch)()
    let src2 = app.users.search.inject(userSearch)()
    expect(src).toBe(src2)
  });
  it('should subscribe to a created api in component using use (auto run)', async () => {
    let app = createApplication<typeof testShape>(testShape)
    app.users.search.inject(userSearch)
    // @ts-expect-error state type is User, not null! forcing it to test
    app.users.search().setState(null, "initial")

    function Component() {
      let data = app.users.search.use({
        lazy: false,
        condition: (s => s.status === "initial")
      })
      return <span data-testid="data">{data.name}</span>
    }

    render(
      <React.StrictMode>
        <React.Suspense fallback={<div data-testid="pending">pending</div>}>
          <Component/>
        </React.Suspense>
      </React.StrictMode>
    )
    expect(screen.getByTestId("pending").innerHTML).toBe("pending")
    await act(async () => await flushPromises())
    expect(screen.getByTestId("data").innerHTML).toBe("incepter")
  });
  it('should subscribe to a created api in component using useAsyncState', async () => {
    let app = createApplication<typeof testShape>(testShape)

    function Component() {
      let {state} = app.users.findOne.inject(userSearch).useAsyncState()
      return <span data-testid="status">{state.status}</span>
    }

    render(
      <React.StrictMode>
        <Component/>
      </React.StrictMode>
    )
    expect(screen.getByTestId("status").innerHTML).toBe("initial")
  });
});
