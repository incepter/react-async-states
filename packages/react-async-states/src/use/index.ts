import {isServer} from "../hydration/context";
import {emptyArray} from "../shared";
import {PartialUseAsyncStateConfiguration, State} from "async-states";
import {useInServer} from "./server";
import {useInClient} from "./client";
import {CreateType} from "../types.internal";

export default function use<T, E>(
  id: string,
  create: CreateType<T, E>,
  deps: any[] = emptyArray,
  options?: PartialUseAsyncStateConfiguration<T, E, never, any[], State<T, E, never, any[]>>
) {
  if (isServer) {
    return useInServer(id, create, deps)
  }
  return useInClient(id, create, deps, options)
}
