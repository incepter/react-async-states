import {maybeWindow} from "../../utils";
import {AsyncState, createSource, Sources} from "../../AsyncState";
import {mockDateNow} from "../utils/setup";
import {Status} from "../../enums";
import {expect} from "@jest/globals";

mockDateNow();
describe('AsyncState instance creation', () => {
  function bootHydration(data) {
    eval(data)
  }

  it('should boot instance state from hydrated content', () => {
    if (!maybeWindow) {
      throw new Error("No globalThis")
    }
    bootHydration(
      'window.__ASYNC_STATES_HYDRATION_DATA__ = Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, {"ASYNC-STATES-default-POOL__INSTANCE__state-1":{"state":{"status":"success","data":42,"props":{"args":[42],"payload":{}},"timestamp":1487076708000},"payload":{}}})'
    )
    let instance = new AsyncState("state-1", null)
    expect(instance.getVersion()).toBe(0)
    expect(instance.getState().data).toBe(42)
    expect(instance.getState().status).toBe("success")
    expect(instance.lastSuccess).toBe(instance.getState())
    bootHydration(
      'window.__ASYNC_STATES_HYDRATION_DATA__ = Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, {"ASYNC-STATES-default-POOL__INSTANCE__state-2":{"state":{"status":"error","data":42,"props":{"args":[42],"payload":{}},"timestamp":1487076708000},"payload":{}}})'
    )
    let instance2 = new AsyncState("state-2", null, {initialValue: 15})
    expect(instance2.getState().data).toBe(42)
    expect(instance2.getState().status).toBe("error")
    expect(instance2.lastSuccess.data).toBe(15)
    expect(instance2.lastSuccess.status).toBe("initial")
  });
  it('should initialize state from cache and invalidate it', () => {
    let persistSpy = jest.fn()
    let instance = new AsyncState("state-3",
      props => props.args[0],
      {
        initialValue(cache) {
          return cache?.stateHash.state.data
        },
        cacheConfig: {
          enabled: true,
          load() {
            return {
              stateHash: {
                addedAt: Date.now(),
                deadline: Date.now() + 1000,
                state: {
                  timestamp: Date.now(),
                  status: Status.success,
                  data: 55,
                  props: {args: [55]}
                }
              },
              stateHash2: {
                addedAt: Date.now(),
                deadline: Date.now() + 1000,
                state: {
                  timestamp: Date.now(),
                  status: Status.success,
                  data: 66,
                  props: {args: [66]}
                }
              },
            }
          },
          persist() {
            persistSpy.apply(null, arguments)
          }
        }
      })

    expect(instance.getState().status).toBe("initial")
    expect(instance.getState().data).toBe(55)

    let prevCache1 = instance.cache!.stateHash

    instance.replaceCache("stateHash", {...prevCache1})
    expect(instance.cache!.stateHash).not.toBe(prevCache1)

    persistSpy.mockClear()
    expect(instance.cache!.stateHash).not.toBe(undefined)
    expect(instance.cache!.stateHash2).not.toBe(undefined)
    instance.invalidateCache("stateHash")
    expect(persistSpy).toHaveBeenCalledTimes(1)
    expect(instance.cache!.stateHash).toBe(undefined)
    expect(instance.cache!.stateHash2).not.toBe(undefined)

    persistSpy.mockClear()
    instance.invalidateCache()
    expect(persistSpy).toHaveBeenCalledTimes(1)
    expect(instance.cache!.stateHash).toBe(undefined)
    expect(instance.cache!.stateHash2).toBe(undefined)
  });

  it('should update given configuration', () => {
    let instance = new AsyncState("state-4", null, {initialValue: 15})
    expect(instance.getConfig().initialValue).toBe(15)
    instance.patchConfig({initialValue: 16})
    expect(instance.getConfig().initialValue).toBe(16)
  });
  it('should answer correctly for hasLane and delete lane', () => {
    let instance = new AsyncState("state-5", null)
    expect(instance.removeLane()).toBe(false)
    expect(instance.hasLane("notfound")).toBe(false)
    instance.getLane("toBeForgotten")
    expect(instance.hasLane("toBeForgotten")).toBe(true)

    expect(instance.removeLane("toBeForgotten")).toBe(true)
    expect(instance.hasLane("toBeForgotten")).toBe(false)
  });
  it('should return main instance on getLane', () => {
    let instance = new AsyncState("state-6", null)
    expect(instance.getLane()).toBe(instance)
  });
  it('should throw when attempting to force a non existing status', () => {
    let instance = new AsyncState("state-7", null, {initialValue: 1})
    // @ts-ignore
    expect(() => instance.setState(15, "unknown")).toThrow("Unknown status ('unknown')")
  });
  it('should return all lanes', () => {
    let instance = new AsyncState("state-8", null)
    expect(instance._source.getAllLanes()).toEqual([])
    let secondSrc = instance.getLane("toForget")._source
    expect(instance._source.getAllLanes()).toEqual([secondSrc])
  });
  it('should get source by all ways', () => {
    let src = createSource({ key: "state-9"})
    expect(src.key).toEqual("state-9")
    expect(Sources.of("state-9")).toBe(src)

    let prevConsoleError = console.error;
    console.error = () => {} // shut warning
    // @ts-ignore
    expect(Sources("state-9")).toBe(src)
    expect(Sources.for("state-9")).toBe(src)
    console.error = prevConsoleError
  });
});
