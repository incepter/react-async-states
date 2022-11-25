import * as React from "react";
import {Source, State, StateInterface} from "../async-state";
import {
  BaseConfig,
  MixedConfig,
  PartialUseAsyncStateConfiguration,
  StateContextValue,
  UseAsyncState
} from "../types.internal";
import {AsyncStateContext} from "./context";
import {isSource} from "../async-state/utils";
import {readSource} from "../async-state/AsyncState";
import {
  AUTO_RUN,
  CHANGE_EVENTS,
  CONFIG_FUNCTION, CONFIG_OBJECT, CONFIG_SOURCE, CONFIG_STRING, FORK, HOIST,
  INSIDE_PROVIDER, LANE,
  NO_MODE, SOURCE,
  STANDALONE, SUBSCRIBE_EVENTS, WAIT
} from "./StateHookFlags";


export const useAsyncStateBase = function useAsyncStateImpl<T, E = State<T>>(
  mixedConfig: MixedConfig<T, E>,
  deps: any[] = [],
  overrides?: PartialUseAsyncStateConfiguration<T, E>,
): UseAsyncState<T, E> {

  const [guard, setGuard] = React.useState<number>(0);
  const contextValue = React.useContext<StateContextValue>(AsyncStateContext);

  const hook: StateHook<T, E> = useCurrentHook();

  React.useMemo(
    () => hook.update(mixedConfig, contextValue, overrides),
    [contextValue, guard, ...deps]
  );

  React.useEffect(
    () => {
      let {flags, instance} = hook;

      if (flags & WAIT) {
        let key: string = flags & CONFIG_STRING
          ? (mixedConfig as string) : (mixedConfig as BaseConfig<T>).key!;

        return contextValue!.watch(key, (maybeInstance) => {
          if (maybeInstance !== instance) {
            setGuard(old => old + 1);
          }
        });
      }

      if (flags & HOIST) {
        contextValue!.hoist
      }

    },
    [contextValue, hook.flags, hook.instance, ...deps]
  );


}

class StateHookImpl<T, E> implements StateHook<T, E> {
  flags: number;
  config: MixedConfig<T, E>;
  instance: StateInterface<T> | null;

  constructor() {
    this.flags = NO_MODE;
  }

  update(
    newConfig: MixedConfig<T, E>,
    contextValue: StateContextValue | null,
    overrides?: PartialUseAsyncStateConfiguration<T, E>
  ) {
    let prevFlags = this.flags;
    let nextFlags = getFlagsFromConfig(newConfig, contextValue, overrides);
    let instance = resolveInstance(nextFlags, newConfig, contextValue, this);

    ensureInstanceResolveMatchesFlags(instance, nextFlags, contextValue);

    this.config = newConfig;
    this.instance = instance;
  }

}
function resolveInstance<T>(
  flags: number,
  config: MixedConfig<T, any>,
  contextValue: StateContextValue | null,
  previousHook: StateHook<T, any>
): StateInterface<T> | null {

  if (flags & WAIT) {
    return null;
  }

  if (flags & SOURCE) {
    if (flags & CONFIG_SOURCE) {
      let instance = readSource(config as Source<T>);
      if (flags & FORK) {
        instance = instance.fork();
      }
      return instance;
    }

    let givenConfig = config as BaseConfig<T>;
    let instance = readSource(givenConfig.source!);
    if (flags & FORK) {
      instance = instance.fork(givenConfig.forkConfig);
    }
    if (flags & LANE) {
      return instance.getLane(givenConfig.lane!)
    }
    return instance;
  }

  if (flags & STANDALONE) {
    let canReuse = canReuseInstance(flags, config, previousHook);
    if (canReuse) {
      patchInstance(previousHook.instance, flags, config);
      return previousHook.instance;
    }
    return constructNewInstance(flags, config);
  }

  if (flags & INSIDE_PROVIDER) {
    let key: string = flags & CONFIG_STRING
      ? (config as string) : (config as BaseConfig<T>).key!;

    let instance = contextValue!.get<T>(key);

    if (flags & FORK) {
      instance = instance.fork((config as BaseConfig<T>).forkConfig);
    }
    if (flags & LANE) {
      return instance.getLane((config as BaseConfig<T>).lane!)
    }

    return instance;
  }

  return null;
}

interface StateHook<T, E> {
  flags: number,
  config: MixedConfig<T, E>,

  instance: StateInterface<T> | null,

  update(
    newConfig: MixedConfig<T, E>,
    contextValue: StateContextValue | null,
    overrides?: PartialUseAsyncStateConfiguration<T, E>
  ),
}

function createStateHook<T, E>(): StateHook<T, E> {
  return new StateHookImpl();
}

function useCurrentHook<T, E>(): StateHook<T, E> {
  const ref = React.useRef<StateHook<T, E>>(null);
  if (!ref) {
    // don't know what about ts in the following line !
    (ref as React.MutableRefObject<StateHook<T, E>>).current = createStateHook();
  }
  return ref.current!;
}


//
// function getMixedConfigTopLevelFlags<T, E>(mixedConfig: MixedConfig<T, E>): number {
//   let flags = NO_MODE;
//
//   if (typeof mixedConfig === "string") {
//     flags |= LISTEN;
//   }
//   if (typeof mixedConfig === "function") {
//     flags = flags | LISTEN | STANDALONE;
//   }
//   if (isAsyncStateSource(mixedConfig)) {
//     flags = flags | LISTEN | SOURCE;
//   }
//
//   return flags;
// }
export function getFlagsFromConfig<T, E>(
  mixedConfig: MixedConfig<T, E>,
  contextValue: StateContextValue | null,
  overrides?: PartialUseAsyncStateConfiguration<T, E>,
): number {
  let flags = NO_MODE;

  if (contextValue !== null) {
    flags |= INSIDE_PROVIDER;
  }
  switch (typeof mixedConfig) {
    case "function": {
      flags |= STANDALONE | CONFIG_FUNCTION;
      break;
    }
    case "string": {
      flags |= CONFIG_STRING;
      if (flags & INSIDE_PROVIDER) {
        if (!contextValue!.get(mixedConfig)) {
          flags |= WAIT;
        }
      } else {
        flags |= STANDALONE;
      }
      break;
    }
    case "object": {
      // attempt source first
      if (isSource(mixedConfig)) {
        flags |= SOURCE | CONFIG_SOURCE;
      } else if (isSource((mixedConfig as BaseConfig<T>).source)) {
        flags |= getBaseConfigFlags(mixedConfig) | SOURCE | CONFIG_OBJECT;
      } else {
        // object and not a source
        // bind other possible flags such as fork, hoist..
        flags |= CONFIG_OBJECT | getBaseConfigFlags(mixedConfig);
        if (flags & INSIDE_PROVIDER) {
          if ((mixedConfig as BaseConfig<T>).key) {
            if (!contextValue!.get((mixedConfig as BaseConfig<T>).key!)) {
              flags |= WAIT;
            }
          } else {
            flags |= STANDALONE;
          }
        } else {
          flags |= STANDALONE;
        }
      }
      break;
    }
    default:
      break;
  }
  // bind other possible flags such as fork, hoist..
  if (overrides) {
    flags |= getBaseConfigFlags(overrides);
  }

  return flags;
}

function getBaseConfigFlags<T>(
  config?: BaseConfig<T>
): number {
  if (!config) {
    return NO_MODE;
  }

  let flags = NO_MODE;

  if (config.hoistToProvider) {
    flags |= HOIST;
  }
  if (config.fork) {
    flags |= FORK;
  }
  if (config.lane) {
    flags |= LANE;
  }
  if (config.events) {
    if (config.events.change) {
      flags |= CHANGE_EVENTS;
    }
    if (config.events.subscribe) {
      flags |= SUBSCRIBE_EVENTS;
    }
  }

  // default behavior is lazy=true; so only change if specified explicitly
  if (config.lazy === false) {
    flags |= AUTO_RUN;
  }

  return flags;
}
