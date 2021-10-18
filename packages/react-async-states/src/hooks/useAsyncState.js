import { oneObjectIdentity, shallowClone, shallowEqual } from "shared";
import { useAsyncStateImpl } from "./useAsyncStateImpl";

// default
function useAsyncStateExport(subscriptionConfig, dependencies) {
  return useAsyncStateImpl(subscriptionConfig, dependencies);
}

// auto runs
const autoConfigOverrides = Object.freeze({lazy: false});

function useAutoAsyncState(subscriptionConfig, dependencies) {
  return useAsyncStateImpl(subscriptionConfig, dependencies, autoConfigOverrides);
}

// lazy
const lazyConfigOverrides = Object.freeze({lazy: true});

function useLazyAsyncState(subscriptionConfig, dependencies) {
  return useAsyncStateImpl(subscriptionConfig, dependencies, lazyConfigOverrides);
}

// fork
const forkConfigOverrides = Object.freeze({fork: true});

function useForkAsyncState(subscriptionConfig, dependencies) {
  return useAsyncStateImpl(subscriptionConfig, dependencies, forkConfigOverrides);
}

// fork auto
const forkAutoConfigOverrides = Object.freeze({fork: true, lazy: false});

function useForkAutoAsyncState(subscriptionConfig, dependencies) {
  return useAsyncStateImpl(subscriptionConfig, dependencies, forkAutoConfigOverrides);
}

// hoist
const hoistConfigOverrides = Object.freeze({hoistToProvider: true});

function useHoistAsyncState(subscriptionConfig, dependencies) {
  return useAsyncStateImpl(subscriptionConfig, dependencies, hoistConfigOverrides);
}

// hoistAuto
const hoistAutoConfigOverrides = Object.freeze({hoistToProvider: true, lazy: false});

function useHoistAutoAsyncState(subscriptionConfig, dependencies) {
  return useAsyncStateImpl(subscriptionConfig, dependencies, hoistAutoConfigOverrides);
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

function curryProperty(argsToOverrides, initialOverrides) {
  return function constructHookBuilder(...args) {
    const configOverrides = shallowClone(initialOverrides, argsToOverrides(args));

    function hookBuilder(subscriptionConfig, dependencies) {
      return useAsyncStateImpl(subscriptionConfig, dependencies, configOverrides);
    }

    function curryConfigOverride(prop1, value1, prop2, value2) {
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

export const useAsyncState = Object.freeze(useAsyncStateExport);
