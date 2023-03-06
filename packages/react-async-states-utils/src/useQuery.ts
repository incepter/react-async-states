//
//
//
// export interface QueryObserverBaseResult<TData = unknown, TError = unknown> {
//   data: TData | undefined
//   dataUpdatedAt: number
//   error: TError | null
//   errorUpdatedAt: number
//   failureCount: number
//   failureReason: TError | null
//   errorUpdateCount: number
//   isError: boolean
//   isFetched: boolean
//   isFetchedAfterMount: boolean
//   isFetching: boolean
//   isLoading: boolean
//   isLoadingError: boolean
//   isInitialLoading: boolean
//   isPaused: boolean
//   isPlaceholderData: boolean
//   isPreviousData: boolean
//   isRefetchError: boolean
//   isRefetching: boolean
//   isStale: boolean
//   isSuccess: boolean
//   refetch: <TPageData>(
//     options?: RefetchOptions & RefetchQueryFilters<TPageData>,
//   ) => Promise<QueryObserverResult<TData, TError>>
//   remove: () => void
//   status: QueryStatus
//   fetchStatus: FetchStatus
// }
//
// export interface QueryObserverRefetchErrorResult<
//   TData = unknown,
//   TError = unknown,
// > extends QueryObserverBaseResult<TData, TError> {
//   data: TData
//   error: TError
//   isError: true
//   isLoading: false
//   isLoadingError: false
//   isRefetchError: true
//   isSuccess: false
//   status: 'error'
// }
//
// export interface QueryObserverSuccessResult<TData = unknown, TError = unknown>
//   extends QueryObserverBaseResult<TData, TError> {
//   data: TData
//   error: null
//   isError: false
//   isLoading: false
//   isLoadingError: false
//   isRefetchError: false
//   isSuccess: true
//   status: 'success'
// }
//
// export type DefinedQueryObserverResult<TData = unknown, TError = unknown> =
//   | QueryObserverRefetchErrorResult<TData, TError>
//   | QueryObserverSuccessResult<TData, TError>
// export type QueryObserverResult<TData = unknown, TError = unknown> =
//   | DefinedQueryObserverResult<TData, TError>
//   | QueryObserverLoadingErrorResult<TData, TError>
//   | QueryObserverLoadingResult<TData, TError>
//
// export type UseBaseQueryResult<
//   TData = unknown,
//   TError = unknown,
// > = QueryObserverResult<TData, TError>
//
// export type UseQueryResult<
//   TData = unknown,
//   TError = unknown,
// > = UseBaseQueryResult<TData, TError>
//

import {
  MixedConfig,
  Producer,
  ProducerConfig,
  State,
  Status,
  UseAsyncState
} from "async-states";
import {useAsyncState} from "react-async-states";

type Result<T, E> = {
  data: T,
  dataUpdatedAt: number,
  error: E | null,
  errorUpdatedAt: number | null,
  failureCount: number | null,
  failureReason: any,
  isError: boolean,
  isFetched: boolean,
  isFetchedAfterMount: boolean,
  isFetching: boolean,
  isPaused: boolean,
  isLoading: boolean,
  isLoadingError: boolean,
  isPlaceholderData: boolean,
  isPreviousData: boolean,
  isRefetchError: boolean,
  isRefetching: boolean,
  isStale: boolean,
  isSuccess: boolean,
  refetch: () => any,
  remove: () => any,
  status: Status,
  fetchStatus: Status,
};

export type QueryKey = readonly unknown[]

type Options<T, E, K extends QueryKey> = {
  queryKey: K,
  queryFn: (ctx) => T | Promise<T>,
  cacheTime: number,
  enabled: boolean,
  networkMode: "online" | "offline",
  initialData: T,
  initialDataUpdatedAt: number,
  keepPreviousData: boolean,
  meta: Record<string, unknown>,
  notifyOnChangeProps: boolean,
  onError?(e: E): void,
  onSettled?(s: T): void,
  onSuccess?(s: T): void,
  placeholderData: T,
  queryKeyHashFn: (key: K) => string,
  refetchInterval: number,
  refetchIntervalInBackground: number,
  refetchOnMount: boolean,
  refetchOnReconnect: boolean,
  refetchOnWindowFocus: boolean,
  retry: boolean | number | ((failureCount: number, error: E) => boolean),
  retryOnMount: boolean,
  retryDelay: number,
  select: () => T,
  staleTime: number,
  structuralSharing,
  suspense: boolean,
  useErrorBoundary: boolean,
}

type MappedConfig<T, E, R, A extends unknown[], S = State<T, E, R, A>> = {
  producerConfig: ProducerConfig<T, E, R, A>,
  config: MixedConfig<T, E, R, A, S>,
  deps: any[]
}

function buildUseAsyncStateConfig<T, E, R, A extends unknown[], K extends QueryKey>(
  options: Options<T, E, K>
):MappedConfig<T, E, R, A, State<T, E, R, A>> {
  let key = JSON.stringify(options.queryKey);
  let producer: Producer<T, E, R, A> = options.queryFn;

  let config: ProducerConfig<T, E, R, A> = {
    initialValue: options.initialData,
    cacheConfig: {
      enabled: options.cacheTime > 0,
      getDeadline: () => options.cacheTime,
    },
  }
  if (options.retry) {
    config.retryConfig = {
      enabled: true,
      backoff: options.retryDelay,
      retry: typeof options.retry === "function" ? options.retry : true,
      maxAttempts: typeof options.retry === "number" ? options.retry : 2,
    };
  }

  let mixedConfig: MixedConfig<T, E, R, A, State<T, E, R, A>> = {
    key,
    producer,
    lazy: false,
    condition: options.enabled !== undefined ? options.enabled : true,
    ...config,
  }

  return {
    config: mixedConfig,
    producerConfig: config,
    deps: [options.enabled]
  };
}


function refreshProducerAndConfig<T, E, R, A extends unknown[], S, K extends QueryKey>(
  result: UseAsyncState<T, E, R, A, S>,
  mappedConfig: MappedConfig<T, E, R, A, S>,
  options: Options<T, E, K>
): void {
  result.source!.patchConfig(mappedConfig.producerConfig);
  result.onChange([
    ({state}) => onQueryStateChange(state, options)
  ]);
  if (options.queryFn) {
    result.source!.replaceProducer(options.queryFn);
  }
}

function onQueryStateChange<T, E, R, A extends unknown[], K extends QueryKey>(
  state: State<T, E, R, A>,
  options: Options<T, E, K>
) {
  if (state.status === Status.success) {
    options.onSuccess?.(state.data);
    options.onSettled?.(state.data);
  }
  if (state.status === Status.error) {
    options.onError?.(state.data);
    // @ts-ignore
    options.onSettled?.(state.data);
  }
}
function mapResult<T, E, R, A extends unknown[], K extends QueryKey>(
  result: UseAsyncState<T, E, R, A>,
  options: Options<T, E, K>
): Result<T, E> {
  let state = result.state;
  let lastSuccess = result.lastSuccess;
  let isPending = state.status === Status.pending;
  let isError = state.status === Status.error;
  return {
    data: lastSuccess!.data as T,
    dataUpdatedAt: lastSuccess!.timestamp,
    error: isError ? state.data as E : null,
    status: state.status,
    isLoading: isPending,
    isFetching: isPending,
    isRefetching: isPending,
    isError: isError,
    isLoadingError: isError,
    isSuccess: state.status === Status.success,
    fetchStatus: state.status,
    errorUpdatedAt: isError ? state.timestamp : null,
    remove: () => {
    },
    failureCount: isError ? 1 : 0,
    failureReason: isError ? state.data as E : null,
    isFetched: lastSuccess!.status === Status.success,
    isFetchedAfterMount: true,
    isPaused: false,
    isPlaceholderData: state.data === result.source!.getConfig().initialValue,
    isPreviousData: isPending && state.data === lastSuccess!.data,
    isRefetchError: isError,
    isStale: state.timestamp + options.staleTime >= Date.now(),
    refetch: result.run,
  };
}

export function useQuery<TQueryFnData, E, T, TQueryData, K extends QueryKey, R, A extends unknown[]>(
  options: Options<T, E, K>
): Result<T, E> {
  let mappedConfig = buildUseAsyncStateConfig<T, E, R, A, K>(options);
  let result = useAsyncState(mappedConfig.config, mappedConfig.deps);

  refreshProducerAndConfig(result, mappedConfig, options);
  return mapResult(result, options);
}
