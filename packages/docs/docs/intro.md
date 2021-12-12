---
sidebar_position: 1
sidebar_label: Intro
---
# React async states
> A naive lightweight library for React state management.

## What is this ?
This is a library for decentralized state management in React.
It assumes that state is issued from a function called the `the producer function` with a single parameter called `props`.

The state value is composed of three properties:

|Property|Type                                   |Description              |
|--------|---------------------------------------|-------------------------|
|`data`  |`T`                                    | The returned data from the `producer function` |
|`status`|`initial,pending,success,error,aborted`| The status of the state |
|`props`  |`ProducerProps`                       | The argument object that the producer was ran with (the `props`) |

To use the states provided by the library, you need to provide the following:

|Property        |Type                 |Description              |
|----------------|---------------------|-------------------------|
|`key`           |`string`             | The unique identifier of the async state |
|`producer`      |`producer function`  | Returns the state value of type `T` |
|`initialValue`  |`T`                  | The argument object that the producer was ran with |

The producer function may be:
- A regular function returning a `Promise` object.
- A regular function returning a value (reducers...).
- An asynchronous function with `async/await` syntax.
- A `generator`.

:::note
The `producer function` is called (either automatically or imperatively) and the state
is whatever this functions returns/throws at any point of time.
The state contains a `status` property because an asynchronous state status isn't a boolean
(`true/false` to indicate a pending state).
:::

The following image shows the possible state transitions:

![img](/img/state-transitions.png)

## Installation
The library as a package on on NPM for use with a module bundler or in a Node application:

```shell
# NPM
npm install react-async-states

# YARN
yarn add react-async-states
```
