---
sidebar_position: 1
sidebar_label: SSR
---

# The server

## Usage in the server

When using the library in the server, the same API remains and almost everything
works the same, except for few things that we will see right after.

It is important to note that the library aims to be consistent in usage
so you can use it without fear or extra work from your part.

## Global sources

In the server, there is a single render pass and there are no effects,
so basically you render an initial HTML that's passed to the client, then
you take it from there.

Probably the most powerful feature the library offers is the ability to create
pieces of state everywhere globally in your app and then connect to them from
any component and even manipulate them.

This power remains in the server and won't harm you. That's the biggest
challenge all state managers face to be able to share state globally and not
leak it between different users requests.

`react-async-states` uses a different approach to tackle this problem. Let dive
deeper now.

## A mandatory `Provider`

In the server, you should provide a `Provider` at the top level of you tree
(not the top one, but keep it as high as possible). Or else, the library will
throw and force you to use it. This is your warranty that nothing will leak
between users and you will still be able to use global states freely.

Under the hood, the library just clones your source with all its definition
and uses a new one without affecting the global one.

In the client, it is the global source that's hydrated and that gets the state.
So the code looks the same, and works as expected without being leaked.

Take a look at this simple counter example:

```tsx title="Providers.tsx"
import { Provider as AsyncStatesProvider } from "react-async-states";

function AppProviders({ children }) {
  return (
    <Routing>
      <ThemeContext>
        // highlight-next-line
        <AsyncStatesProvider>{children}</AsyncStatesProvider>
      </ThemeContext>
    </Routing>
  );
}
```

```tsx title="Counter.tsx"
import { createSource, useAsync } from "react-async-states";

const counter = createSource("counter", null, { initialValue: 2 });

function Counter() {
  const { data: count } = useAsync(counter);

  return (
    <div>
      <span>Count is : {count}</span>
    </div>
  );
}
```

This code will work, until you need something that depends from the user request
or the user itself and the hydration will fail.

To address this, the library makes two APIs at your disposal for a general
purpose solution, and one that's optimized for nextjs usage.

### `<Hydrate />`

`useAsync` and `useData` return a component that allows hydrating that specific
state:

```tsx
const serverTime = createSource("server-time", null, {
  initialValue: Date.now(),
});

function ServerTime() {
  const { data: time, Hydrate } = useData(serverTime);

  return (
    <div>
      // highlight-next-line
      <Hydrate />
      <span>Server time is : {time}</span>
    </div>
  );
}
```

It will take care of everything for you.

### `<Hydration />`

the `Hydration` component allows you to pass a collections of `sources` that it
will hydrate for you:

```tsx
import { Hydration, useData } from "react-async-states";

const serverTime = createSource("server-time", null, {
  initialValue: Date.now(),
});

function ServerTime() {
  const { data: time } = useData(serverTime);

  return (
    <div>
      // highlight-next-line
      <Hydration target={[serverTime]} />
      <span>Server time is : {time}</span>
    </div>
  );
}
```

### `NextJs`

When using NextJs, you will be able to totally exclude the `Hydrate` and
`Hydration` components and leverage the `useServerInsertedHTML` Next API that
allows you to pass some HTML from the server to the client whenever a suspense
boundary completes.

The library allows a fast path to take advantage of this API in the simplest
possible way without needing to worry about hydration:

```tsx title="Providers.tsx"
import { useServerInsertedHTML } from "next/navigation";
import { Provider as AsyncStatesProvider } from "react-async-states";

function AppProviders({ children }) {
  return (
    <Routing>
      <ThemeContext>
        // highlight-next-line
        <AsyncStatesProvider serverInsertedHtmlHook={useServerInsertedHTML}>
          {children}
        </AsyncStatesProvider>
      </ThemeContext>
    </Routing>
  );
}
```

And that's it! that's all you need to unlock everything when using NextJs or any
framework that offers a similar API.

### Global sources as server side cache

You may have wondered and had the though of the ability to use the state of the
server when cloning sources for a request (state is not cloned by default).

To do so, all you need is: `useServerState: true` passed to `useAsync` or
`useData`. And this way the library can play the role of a server side cache
that's co-located with your app with zero latency.

```tsx
const countries = createSource("countries", getCountries, {cacheConfig: {...}});

if (isServer) {
  countries.run();
}

function SomeComponent() {
  let { data: countriesList } = useData({
    source: countries,
    useServerState: true,
  });

  return <span>We have {countriesList.length} countries.</span>;
}
```
