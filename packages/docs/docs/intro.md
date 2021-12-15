---
sidebar_position: 1
sidebar_label: Intro
---
# React async states
> A naive lightweight library for React state management.

## What is this ?
This is a library for decentralized state management in React.
It assumes that state is issued from a function called the `the producer function` with a single parameter called `props`.

The producer function may be:
- A regular function returning a `Promise` object.
- A regular function returning a value (reducers...).
- An asynchronous function with `async/await` syntax.
- A `generator`.

The state value is composed of three properties:

|Property|Type                                   |Description              |
|--------|---------------------------------------|-------------------------|
|`data`  |`T`                                    | The returned data from the `producer function` |
|`status`|`initial,pending,success,error,aborted`| The status of the state |
|`props`  |`ProducerProps`                       | The argument object that the producer was ran with (the `props`) |

The following image shows the possible state transitions:

![img](/img/state-transitions.png)

:::note
1- The library supports synchronous states as well.

If the producer function returns a value besides a `Promise` or a `Generator`, it is considered synchronous
and pass directly to `success` or `error` state.

2- The producer's execution is wrapped inside try catch block, any thrown error will be received as the following state:
```javascript
state = {
  data: e,// the catched error
  status: "error",
  props: {}, // the producer's parameter when it was ran
}
```
:::

To use the states provided by the library, you need to provide the following:

|Property        |Type                 |Description              |
|----------------|---------------------|-------------------------|
|`key`           |`string`             | The unique identifier of the async state |
|`producer`      |`producer function`  | Returns the state value of type `T` |
|`configuration` |`AsyncStateConfig`   | The argument object that the producer was ran with |

The configuration can contain the following:

|Property              |Type                                      |Description               |
|----------------------|------------------------------------------|-------------------------|
|`initialValue`        |`T`                                       | The initial value or the initializer of the state (status = `initial`) |
|`runEffect`           |`oneOf('debounce', 'throttle', undefined)`| An effect to apply when running the producer, can be used to debounce or throttle |
|`runEffectDurationMs` |`number > 0`, `undefined`                 | The debounce/throttle duration |


## Installation
The library as a package on on NPM for use with a module bundler or in a Node application:

```shell
# NPM
npm install react-async-states

# YARN
yarn add react-async-states
```
