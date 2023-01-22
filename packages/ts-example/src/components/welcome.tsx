import {
  createSource,
  ProducerProps,
  useAsyncState, Status, RunEffect
} from "react-async-states";
import User from "../pages/user";
import {StateBoundary, useBoundary} from "react-async-states-utils";


type User = {
  email: string,
  username: string,
}

function fetchUser(props: ProducerProps<User, Error>) {
  if (!props.args[0]) {
    props.abort!();
    throw new Error('User id is required!')
  }
  let controller = new AbortController();
  props.onAbort(() => controller.abort());

  return fetch(`https://jsonplaceholder.typicode.com/users/${props.args[0]}`, {signal: controller.signal})
    .then(res => {
      if (res.status > 300 || res.status < 200) {
        throw new Error(`${res.status}`);
      }
      return res.json();
    });
}

let userDetails = createSource("user-details", fetchUser, {
  // skipPendingDelayMs: 50,
  // runEffectDurationMs: 200,
  resetStateOnDispose: true,
  runEffect: RunEffect.debounce,
  keepPendingForMs: 200,
  cacheConfig: {
    enabled: true,
    hash: (args) => args![0],
    getDeadline: (s) => s.data.maxAge || 10_000,
    load: () => JSON.parse(localStorage.getItem("users") ?? "{}"),
    persist: (cache) => localStorage.setItem("users", JSON.stringify(cache)),
  }
});
userDetails.on("dispose", () => {
  console.log('disposed !!!');
});

userDetails.on("change", [
  state => console.log('EVENT', 'CHANGE', state),
  {
    status: Status.success,
    handler(successState) {
      console.log('EVENT CHANGE TO STATUS SUCCESS', successState);
    }
  },
  {
    status: Status.error,
    handler(err) {
      console.log('EVENT CHANGE TO STATUS ERROR', err);
    }
  },
]);

userDetails.on("cache-change", cache => {
  console.log('EVENT', 'CACHE CHANGE', cache);
});


export default function Welcome() {
  let {source, state, run} = useAsyncState(userDetails);

  let searchedUserId: string | null = state.status === Status.initial ? null : state.props.args![0];

  let summary = state.status === Status.pending ? `Fetching user ${searchedUserId}` :
    state.status === Status.success ? `User ${state.data.username} details` :
      state.status === Status.error ? `User ${searchedUserId} fetch error` : 'Search results'

  return (
    <div>
      <div>
        <input onChange={e => run(e.target.value)} type="text" id="user_id"
               className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-40 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
               placeholder="User id" required/>
      </div>
      {state.status === Status.success && (
        <span>
          <h2>Welcome to User {state.data.username} details</h2>
        </span>
      )}
      <details open>
        <summary>{summary}</summary>
        <pre>
        {JSON.stringify({
          status: state.status,
          data: state.status === Status.error ? state.data.message : state.data,
        }, null, 4)}
      </pre>
      </details>
      <hr/>
      <hr/>
      <hr/>
      <hr/>
      <BoundaryDemo source={source}/>
    </div>
  );
}

let counter = createSource("counter", null, {initialValue: 0});

function BoundaryDemo({source}) {
  return (
    <StateBoundary config={source}>
      <StateBoundary config={counter}>
        <Counter/>
        <div>
          <BoundaryDemoChildren/>
        </div>
      </StateBoundary>
    </StateBoundary>

  );
}

function Counter() {
  let {state, run} = useBoundary<number>();
  return (
    <details open>
      <summary>Children</summary>
      <button onClick={() => run(old => old.data + 1)}>increment</button>
      <pre>
        {JSON.stringify(state, null, 4)}
      </pre>
    </details>
  );
}

function BoundaryDemoChildren() {
  let {state} = useBoundary<number>("counter");
  return (
    <details>
      <summary>Children</summary>
      <pre>
        {JSON.stringify(state, null, 4)}
      </pre>
    </details>
  );
}
