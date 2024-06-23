import { UseConfig } from "../types.internal";
import { LegacyHookReturn, ModernHookReturn } from "../hooks/types";
import { Producer, ProducerConfig, Source, State } from "async-states";

export type Api<TData, TArgs extends unknown[] = [], TError = Error> = {
  (): Source<TData, TArgs, TError>;
  source: Source<TData, TArgs, TError>;
  define(
    fn: Producer<TData, TArgs, TError>,
    config?: ProducerConfig<TData, TArgs, TError>
  ): Api<TData, TArgs, TError>;
  useData<S = State<TData, TArgs, TError>>(
    config?: UseConfig<TData, TArgs, TError, S>,
    deps?: any[]
  ): ModernHookReturn<TData, TArgs, TError, S>;
  useAsync<S = State<TData, TArgs, TError>>(
    config?: UseConfig<TData, TArgs, TError, S>,
    deps?: any[]
  ): LegacyHookReturn<TData, TArgs, TError, S>;
};
export type AnyApi = Api<any, any, any>;
export type AppShape = Record<string, Record<string, AnyApi>>;

export type App<TApp extends AppShape> = {
  [resource in keyof TApp]: Resource<TApp[resource]>;
};
export type Resource<TResource extends Record<string, AnyApi>> = {
  [api in keyof TResource]: TResource[api];
};

export type InferData<
  TApp extends AppShape,
  TRes extends keyof App<TApp>,
  TApi extends keyof App<TApp>[TRes],
> = TApp[TRes][TApi] extends Api<infer T, any, any> ? T : never;

export type InferArgs<
  TApp extends AppShape,
  TRes extends keyof App<TApp>,
  TApi extends keyof App<TApp>[TRes],
> = App<TApp>[TRes][TApi] extends Api<any, infer A extends unknown[]>
  ? A
  : never;

export type InferError<
  TApp extends AppShape,
  TRes extends keyof App<TApp>,
  TApi extends keyof App<TApp>[TRes],
> = App<TApp>[TRes][TApi] extends Api<any, any, infer E> ? E : never;
