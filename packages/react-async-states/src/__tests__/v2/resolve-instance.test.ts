import {createStateHook, resolveInstance, StateHook} from "../../react/useAsyncStateBase";
import {
  CONFIG_OBJECT,
  CONFIG_SOURCE, CONFIG_STRING, FORK, HOIST,
  INSIDE_PROVIDER, LANE,
  SOURCE, STANDALONE,
  WAIT
} from "../../react/StateHookFlags";
import AsyncState, {AsyncStateManager} from "../../async-state";

describe('resolveInstance', () => {
  it('should resolve instance in WAIT mode', () => {
    expect(resolveInstance(WAIT, "irrelevant", null, null)).toBe(null);
    expect(resolveInstance(WAIT | INSIDE_PROVIDER, {}, null, null)).toBe(null);
  });
  it('should resolve instance Sources', () => {
    let instance = new AsyncState("key", null);

    expect(resolveInstance(CONFIG_SOURCE | SOURCE, instance._source, null, null))
      .toBe(instance);

    expect(
      resolveInstance(
        CONFIG_OBJECT | SOURCE | INSIDE_PROVIDER,
        {source: instance._source},
        null,
        null)
    ).toBe(instance);

    expect(
      resolveInstance(
        CONFIG_OBJECT | SOURCE | INSIDE_PROVIDER | LANE,
        {source: instance._source, lane: 'test'},
        null,
        null)
    ).toBe(instance.getLane('test'));

    expect(
      resolveInstance(
        CONFIG_OBJECT | SOURCE | INSIDE_PROVIDER | FORK,
        {source: instance._source, fork: true},
        null,
        null)
    ).not.toBe(instance);

    expect(
      resolveInstance(
        CONFIG_SOURCE | SOURCE | INSIDE_PROVIDER | FORK,
        instance._source,
        null,
        null)
    ).not.toBe(instance);
  });
  it('should resolve instance when inside provider', () => {
    let instance = new AsyncState("key", null);
    let manager = AsyncStateManager({ key: instance._source });


    expect(
      resolveInstance(
        CONFIG_OBJECT | INSIDE_PROVIDER | HOIST,
        {key: "key", hoistToProviderConfig: {override: true}},
        manager,
        null)
    ).not.toBe(instance);

    expect(
      resolveInstance(
        CONFIG_STRING | INSIDE_PROVIDER | HOIST,
        "key",
        manager,
        null)
    ).toBe(instance);

    expect(
      resolveInstance(
        CONFIG_OBJECT | INSIDE_PROVIDER | HOIST,
        {key: "key"},
        manager,
        null)
    ).toBe(instance);

    expect(
      resolveInstance(
        CONFIG_OBJECT | INSIDE_PROVIDER | HOIST | LANE,
        {key: "key", lane: "test"},
        manager,
        null)
    ).toBe(instance.getLane("test"));

    expect(
      resolveInstance(
        CONFIG_OBJECT | INSIDE_PROVIDER | HOIST | FORK | LANE,
        {key: "key", lane: "test"},
        manager,
        null)
    ).not.toBe(instance.getLane("test"));

    expect(
      resolveInstance(
        CONFIG_STRING | INSIDE_PROVIDER,
        "key",
        manager,
        null)
    ).toBe(instance);
  });
  it('should resolve instance  when standalone', () => {
    let instance = new AsyncState("key", null);
    let manager = AsyncStateManager({ key: instance._source });

    expect(
      resolveInstance(
        CONFIG_OBJECT | INSIDE_PROVIDER | STANDALONE,
        {initialValue: 5},
        manager,
        null).config.initialValue
    ).toBe(5);


    expect(
      resolveInstance(
        STANDALONE,
        undefined,
        null,
        null).key.startsWith("async-state-")
    ).toBe(true);

    let hook: StateHook<any, any> = createStateHook();

    hook.flags = CONFIG_STRING | STANDALONE;
    hook.instance = instance;
    hook.config = "key";


    // reused instance with patches
    let newInstance = resolveInstance(
      CONFIG_OBJECT | STANDALONE,
      {key: "key", initialValue: 15},
      null,
      hook);

    expect(newInstance).toBe(instance);
    expect(newInstance.config.initialValue).toBe(15);
    expect(newInstance.originalProducer).toBe(undefined);

    // dont reuse becaue of flags

    hook.flags = CONFIG_STRING | WAIT;
    hook.config = "key";

    newInstance = resolveInstance(
      CONFIG_OBJECT | STANDALONE,
      {key: "key", initialValue: 15},
      null,
      hook);

    expect(newInstance).not.toBe(instance);
    expect(newInstance.config.initialValue).toBe(15);
    expect(newInstance.originalProducer).toBe(undefined);
  });
});
