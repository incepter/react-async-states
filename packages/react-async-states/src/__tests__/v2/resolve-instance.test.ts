import {
  CONFIG_OBJECT,
  CONFIG_SOURCE, CONFIG_STRING, FORK, HOIST,
  INSIDE_PROVIDER, LANE,
  SOURCE, STANDALONE,
  WAIT
} from "../../StateHookFlags";
import {AsyncState,AsyncStateManager} from "async-states";
import {resolveInstance, StateHook} from "../../StateHook";
import {createStateHook} from "../../helpers/hooks-utils";

describe('resolveInstance', () => {
  it('should resolve instance in WAIT mode', () => {
    expect(resolveInstance(WAIT, "irrelevant", null, null)).toBe(null);
    expect(resolveInstance(WAIT | INSIDE_PROVIDER, {}, null, null)).toBe(null);
  });
  it('should resolve instance Sources', () => {
    let instance = new AsyncState("key1", null);

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
        {source: instance._source, lane: 'test1'},
        null,
        null)
    ).toBe(instance.getLane('test1'));

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
    let instance = new AsyncState("key2", null);
    let manager = AsyncStateManager({ key: instance._source });


    expect(
      resolveInstance(
        CONFIG_OBJECT | INSIDE_PROVIDER | HOIST,
        {key: "key2", hoistConfig: {override: true}},
        manager,
        null)
    ).toBe(instance);

    expect(
      resolveInstance(
        CONFIG_STRING | INSIDE_PROVIDER | HOIST,
        "key2",
        manager,
        null)
    ).toBe(instance);

    expect(
      resolveInstance(
        CONFIG_OBJECT | INSIDE_PROVIDER | HOIST,
        {key: "key2"},
        manager,
        null)
    ).toBe(instance);

    expect(
      resolveInstance(
        CONFIG_OBJECT | INSIDE_PROVIDER | HOIST | LANE,
        {key: "key2", lane: "test2"},
        manager,
        null)
    ).toBe(instance.getLane("test2"));

    expect(
      resolveInstance(
        CONFIG_OBJECT | INSIDE_PROVIDER | HOIST | FORK | LANE,
        {key: "key2", lane: "test2"},
        manager,
        null)
    ).not.toBe(instance.getLane("test2"));

    expect(
      resolveInstance(
        CONFIG_STRING | INSIDE_PROVIDER,
        "key2",
        manager,
        null)
    ).toBe(instance);
  });
  it('should resolve instance  when standalone', () => {
    let instance = new AsyncState("key3", null);
    let manager = AsyncStateManager({ key: instance._source });

    expect(
      resolveInstance(
        CONFIG_OBJECT | INSIDE_PROVIDER | STANDALONE,
        {initialValue: 5},
        manager,
        null)!.config.initialValue
    ).toBe(5);


    expect(
      resolveInstance(
        STANDALONE,
        undefined,
        null,
        null)!.key.startsWith("async-state-")
    ).toBe(true);

    let hook: StateHook<any> = createStateHook();

    hook.flags = CONFIG_STRING | STANDALONE;
    hook.instance = instance;
    hook.config = "key3";


    // reused instance with patches
    let newInstance = resolveInstance(
      CONFIG_OBJECT | STANDALONE,
      {key: "key3", initialValue: 15},
      null,
      hook);

    expect(newInstance).toBe(instance);
    expect(newInstance!.config.initialValue).toBe(15);
    expect(newInstance!.originalProducer).toBe(undefined);

    // dont reuse becaue of flags

    hook.flags = CONFIG_STRING | WAIT;
    hook.config = "key3";

    newInstance = resolveInstance(
      CONFIG_OBJECT | STANDALONE,
      {key: "key3", initialValue: 15},
      null,
      hook);

    expect(newInstance).toBe(instance);
    expect(newInstance!.config.initialValue).toBe(15);
    expect(newInstance!.originalProducer).toBe(undefined);
  });
});
