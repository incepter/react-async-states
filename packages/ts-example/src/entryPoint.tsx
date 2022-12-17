import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router-dom";
import AppRoutes from "./routes/appRoutes";
import "antd/dist/antd.css";
import {
  useAsyncState,
  Status,
  createSource,
  ProducerProps,
  BaseState, State,
  InitialState,
  PendingState,
  SuccessState,
  ErrorState,
  AbortedState,
} from "react-async-states";


type InitialExtendedState =  {isInitial: true, isPending: false, isError: false, isAborted: false, isSuccess: false};
type PendingExtendedState =  {isInitial: false, isPending: true, isError: false, isAborted: false, isSuccess: false};
type SuccessExtendedState =  {isInitial: false, isPending: false, isError: false, isAborted: false, isSuccess: true};
type ErrorExtendedState =  {isInitial: false, isPending: false, isError: true, isAborted: false, isSuccess: false};
type AbortedExtendedState =  {isInitial: false, isPending: false, isError: false, isAborted: true, isSuccess: false};

export type ExtendedState<T, E = any, R = any> =
  InitialState<T>       & InitialExtendedState |
  PendingState<T>       & PendingExtendedState |
  SuccessState<T>       & SuccessExtendedState |
  ErrorState<T, E>      & ErrorExtendedState |
  AbortedState<T, E, R> & AbortedExtendedState;

type ExtendStatusReturn<T, E, R> =
  InitialExtendedState |
  PendingExtendedState |
  SuccessExtendedState |
  AbortedExtendedState |
  ErrorExtendedState  ;

export function extendStatus<T, E = any, R = any>(
  state: State<T, E, R>
): ExtendStatusReturn<T, E, R> {
  let status = state.status;
  switch (status) {
    case Status.initial: {
      return {isInitial: true, isPending: false, isError: false, isAborted: false, isSuccess: false}
    }
    case Status.pending: {
      return {isInitial: false, isPending: true, isError: false, isAborted: false, isSuccess: false}
    }
    case Status.aborted: {
      return {isInitial: false, isPending: false, isError: false, isAborted: true, isSuccess: false}
    }
    case Status.success: {
      return {isInitial: false, isPending: false, isError: false, isAborted: false, isSuccess: true}
    }
    case Status.error: {
      return {isInitial: false, isPending: false, isError: true, isAborted: false, isSuccess: false}
    }
  }
  throw new Error(`Status ${status} isn't recognized!`);
}

function defaultSelector<T, E = any, R = any>(state: State<T, E, R>): ExtendedState<T, E, R> {
  let extended = extendStatus<T, E, R>(state);
  return Object.assign({}, extended, state) as ExtendedState<T, E, R>;
}

function EntryPoint() {

  type User = { username: string, password: string };

  function producer(props: ProducerProps<User, Error, "Timeout">): Promise<User> {
    if (!props.args[0]) throw new Error("username or password is incorrect");
    return Promise.resolve({username: 'admin', password: 'admin'});
  }

  let {state, runc} = useAsyncState({producer, selector: defaultSelector});

  if (state.isPending) {
    let {data} = state; // type of data: null
  }
  if (state.isError) {
    let {data} = state; // type of data: Error
  }
  if (state.isAborted) {
    let {data} = state; // type of data: "Timeout"
  }

  if (state.status === Status.initial) {
    let data = state.data; // ts type of data <- User | undefined
    let {isError, isSuccess} = state;
    if (isSuccess) { // <- type of isSuccess is false
      console.log("impossible")
    }
    if (isError) {  // <- type of isError is false
      console.log('impossible')
    }
  }
  if (state.status === Status.pending) {
    let data = state.data; // ts type of data <- null
  }
  if (state.status === Status.success) {
    let data = state.data; // ts type of data <- User
  }
  if (state.status === Status.error) {
    let data = state.data; // ts type of data <- Error
  }
  if (state.status === Status.aborted) {
    let data = state.data; // ts type of data <- "Timeout"
  }
  //
  // runc({
  //   onSuccess(state) {
  //     let {data, status} = state; // <- data type is User, status is success
  //   },
  //   onError(state) {
  //     let {data, status} = state; // <- data type is Error, status is error
  //   },
  //   onAborted(state) {
  //     let {data, status} = state; // <- data type is "Timeout", status is aborted
  //   },
  // });


  return <RouterProvider router={appRouter}/>;
}
const appRouter = createBrowserRouter(createRoutesFromElements(AppRoutes));

export default EntryPoint;
