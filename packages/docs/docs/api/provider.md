---
sidebar_position: 2
sidebar_label: AsyncStateProvider
---
# `AsyncStateProvider`
To share the state returned from your producer function, you need a Provider to hold it.

The main purpose of the provider is:
- To hold the async states and allows subscription and selection
- To hold a universal payload that's given to all registered async states

It accepts the following props:

|Prop                | PropType                                                 | Default value | Usage                                                             |
|--------------------|----------------------------------------------------------|---------------|-------------------------------------------------------------------|
|`payload`           | `{ [id: string]: any }`                                  | `{}`          | Payload at provider level, will be accessible to all async states |
|`initialStates`     | `record or array of ({key, producer, config} or source)` | `[]`          | The initial record or array of definitions of async states        |
|`children`          | `ReactElement`                                           | `undefined`   | The React tree inside this provider                               |

To define an async state for the provider, you need the following:

|Property      | Type             | Default value| Description                                          |
|--------------|------------------|--------------|------------------------------------------------------|
|`key`         | `string`         |`undefined`   | The unique identifier or the name of the async state |
|`producer`    | `Producer<T>`    |`undefined`   | The producer function                                |
|`config`      | `ProducerConfig` |`undefined`   | The configuration of the producer                    |

The `initialStates`, like stated, is an array of objects or a map; let's create some:
```javascript
// pass this to provider
let demoAsyncStates = {
  users: {
    key: "users",
    initialValue: [],
    producer: async function getUsers(props) {
      return await fetchUsers(props.payload.queryString);
    },
  },
  currentUser: createSource(
    "currentUser",
    // generators are the recommended way to go!
    // because they allow to abort between yields! unlike promises and async-await!
    getCurrentUserGenerator,
  ),
  // with undefined producer, you will be calling `replaceState` to change the state
  somethingOpen: {
    key: "somethingOpen",
    initialValue: false,
  },
  localTodos: {
    key: "something",
    initialValue: {},
    producer: function todosReducerPromise(props) {
      // myTodosReducer is a regular reducer(state, action) that returns the new state value, my guess is that you've wrote many
      return myTodosReducer(props.lastSuccess, ...props.args);
    }
  },
}
const initialAsyncStates = Object.values(demoAsyncStates); // or pass this to provider
```
