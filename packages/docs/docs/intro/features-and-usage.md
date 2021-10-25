---
sidebar_position: 1
sidebar_label: Features and usage
---

# Motivations and features

This library aims to facilitate working with [a]synchronous states while sharing them.
It was designed to help us reduce the needed boilerplate (code/files) to achieve great results. The main features that
makes it special are:
- Minimal and Easy to use API.
- Tiny library with 0 dependencies, it only requests react as a peer dependency, and should target all environments.
- Run, abort and replace state anytime.
- Dynamic creation and sharing of states at runtime.
- Share states inside and outside the context provider.
- Subscribe and react to selected portions of state while controlling when to re-render.
- Fork an asynchronous state to re-use its promise function without impacting its state value.
- Hoist states to provider on demand.
- Bidirectional abort binding that lets you register an `abort callback` from the promise function.
- Automatic cleanup/reset on dependencies change (includes unmount).
- Supports many forms on promise functions (async/await, promises, generators, reducers...).
- Powerful selectors system.

And many more features.

# Use cases
