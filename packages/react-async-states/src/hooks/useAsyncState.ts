import {oneObjectIdentity, shallowClone, shallowEqual} from "../../../shared";
import {useAsyncStateImpl} from "./useAsyncStateImpl";
import {
  EqualityFn,
  ExtendedUseAsyncStateConfiguration,
  HoistToProviderConfig,
  PartialUseAsyncStateConfiguration,
  UseSelectedAsyncState
} from "../types.internal";
import {
  AsyncStateKey,
  AsyncStateSource,
  ForkConfig,
  Producer,
  ProducerRunEffects,
  State
} from "../../../async-state";

// default
function useAsyncStateExport<T, E>(
  subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
  dependencies?: any[]
): UseSelectedAsyncState<T, E> {
  return useAsyncStateImpl(
    subscriptionConfig,
    dependencies
  );
}

// auto runs
const autoConfigOverrides = Object.freeze({lazy: false});

function useAutoAsyncState<T, E>(
  subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
  dependencies: any[]
): UseSelectedAsyncState<T, E> {
  return useAsyncStateImpl(
    subscriptionConfig,
    dependencies,
    autoConfigOverrides
  );
}

// lazy
const lazyConfigOverrides = Object.freeze({lazy: true});

function useLazyAsyncState<T, E>(
  subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
  dependencies: any[]
): UseSelectedAsyncState<T, E> {
  return useAsyncStateImpl(
    subscriptionConfig,
    dependencies,
    lazyConfigOverrides
  );
}

// fork
const forkConfigOverrides = Object.freeze({fork: true});

function useForkAsyncState<T, E>(
  subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
  dependencies: any[]
): UseSelectedAsyncState<T, E> {
  return useAsyncStateImpl(
    subscriptionConfig,
    dependencies,
    forkConfigOverrides
  );
}

// fork auto
const forkAutoConfigOverrides = Object.freeze({fork: true, lazy: false});

function useForkAutoAsyncState<T, E>(
  subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
  dependencies: any[]
): UseSelectedAsyncState<T, E> {
  return useAsyncStateImpl(
    subscriptionConfig,
    dependencies,
    forkAutoConfigOverrides
  );
}

// hoist
const hoistConfigOverrides = Object.freeze({hoistToProvider: true});

function useHoistAsyncState<T, E>(
  subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
  dependencies: any[]
): UseSelectedAsyncState<T, E> {
  return useAsyncStateImpl(
    subscriptionConfig,
    dependencies,
    hoistConfigOverrides
  );
}

// hoistAuto
const hoistAutoConfigOverrides = Object.freeze({
  hoistToProvider: true,
  lazy: false
});

function useHoistAutoAsyncState<T, E>(
  subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
  dependencies: any[]
): UseSelectedAsyncState<T, E> {
  return useAsyncStateImpl(
    subscriptionConfig,
    dependencies,
    hoistAutoConfigOverrides
  );
}

function selectorArgsToOverrides(args) {
  const areEqual = args[1] || shallowEqual;
  const selector = args[0] || oneObjectIdentity;

  return {selector, areEqual};
}

function payloadArgsToOverrides(args) {
  return {payload: args[0]};
}

function conditionArgsToOverrides(args) {
  return {condition: args[0]};
}

function curryProperty<T, E>(
  argsToOverrides,
  initialOverrides?: PartialUseAsyncStateConfiguration<T, E>
) {
  return function constructHookBuilder(...args) {

    const configOverrides = shallowClone(initialOverrides, argsToOverrides(args));

    function hookBuilder(subscriptionConfig, dependencies) {
      return useAsyncStateImpl(subscriptionConfig, dependencies, configOverrides);
    }

    function curryConfigOverride(prop1, value1?, prop2?, value2?) {
      return function hook(subscriptionConfig, dependencies) {
        configOverrides[prop1] = value1;
        if (prop2 !== undefined) {
          configOverrides[prop2] = value2;
        }
        return useAsyncStateImpl(subscriptionConfig, dependencies, configOverrides);
      }
    }

    hookBuilder.fork = curryConfigOverride("fork", true);
    hookBuilder.lazy = curryConfigOverride("lazy", true);
    hookBuilder.auto = curryConfigOverride("lazy", false);
    hookBuilder.hoist = curryConfigOverride("hoistToProvider", true);
    hookBuilder.forkAuto = curryConfigOverride("fork", true, "lazy", false);
    hookBuilder.hoistAuto = curryConfigOverride("hoist", true, "lazy", false);

    hookBuilder.payload = curryProperty(payloadArgsToOverrides, configOverrides);
    hookBuilder.selector = curryProperty(selectorArgsToOverrides, configOverrides);
    hookBuilder.condition = curryProperty(conditionArgsToOverrides, configOverrides);

    return Object.freeze(hookBuilder);
  }
}

type Builder<T, E> = {
  initialValue: (value: T) => Builder<T, E>,
  producer: (producer: Producer<T>) => Builder<T, E>
  key: (key: AsyncStateKey) => Builder<T, E>,
  source: (src: AsyncStateSource<T>) => Builder<T, E>,
  runEffect: (effect: ProducerRunEffects) => Builder<T, E>,
  runEffectDurationMs: (duration: number) => Builder<T, E>,
  payload: (payload: { [id: string]: any }) => Builder<T, E>,
  lazy: (lazy: boolean) => Builder<T, E>,
  fork: (fork: boolean) => Builder<T, E>,
  condition: (condition: boolean) => Builder<T, E>,
  hoistToProvider: (hoist: boolean) => Builder<T, E>,
  forkConfig: (forkConfig: ForkConfig) => Builder<T, E>,
  hoistToProviderConfig: (hoistConfig: HoistToProviderConfig) => Builder<T, E>,
  subscriptionKey: (subKey: AsyncStateKey) => Builder<T, E>,
  selector: (selector: (
    currentState: State<T>, lastSuccess: State<T>) => E) => Builder<T, E>,
  areEqual: (areEqual: EqualityFn<E>) => Builder<T, E>,

  build: (
    subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
    dependencies: any[]
  ) => UseSelectedAsyncState<T, E>
}

function BuilderImpl<T, E>(): Builder<T, E> {
  const builder = Object.create(null);
  const overrides = Object.create(null);

  function applyOverride(name, value) {
    overrides[name] = value;
    return builder;
  }

  function build(
    subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
    dependencies: any[]
  ) {
    return useAsyncStateImpl(subscriptionConfig, dependencies, overrides);
  }

  builder.initialValue = applyOverride.bind(null, "initialValue");
  builder.producer = applyOverride.bind(null, "producer");
  builder.key = applyOverride.bind(null, "key");
  builder.source = applyOverride.bind(null, "source");
  builder.runEffect = applyOverride.bind(null, "runEffect");
  builder.runEffectDurationMs = applyOverride.bind(null, "runEffectDurationMs");
  builder.payload = applyOverride.bind(null, "payload");
  builder.lazy = applyOverride.bind(null, "lazy");
  builder.fork = applyOverride.bind(null, "fork");
  builder.condition = applyOverride.bind(null, "condition");
  builder.hoistToProvider = applyOverride.bind(null, "hoistToProvider");
  builder.forkConfig = applyOverride.bind(null, "forkConfig");
  builder.hoistToProviderConfig = applyOverride.bind(null, "hoistToProviderConfig");
  builder.subscriptionKey = applyOverride.bind(null, "subscriptionKey");
  builder.selector = applyOverride.bind(null, "selector");
  builder.areEqual = applyOverride.bind(null, "areEqual");

  builder.build = build;

  return builder;
}

useAsyncStateExport.auto = useAutoAsyncState;
useAsyncStateExport.lazy = useLazyAsyncState;
useAsyncStateExport.fork = useForkAsyncState;
useAsyncStateExport.hoist = useHoistAsyncState;
useAsyncStateExport.forkAuto = useForkAutoAsyncState;
useAsyncStateExport.hoistAuto = useHoistAutoAsyncState;

useAsyncStateExport.payload = curryProperty(payloadArgsToOverrides);
useAsyncStateExport.selector = curryProperty(selectorArgsToOverrides);
useAsyncStateExport.condition = curryProperty(conditionArgsToOverrides);

useAsyncStateExport.builder = BuilderImpl;

export const useAsyncState: <T, E>(
  subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
  dependencies?: any[]
) => UseSelectedAsyncState<T, E> = Object.freeze(useAsyncStateExport);
