import { maybeWindow } from "../../utils";
import { AsyncState, createSource, getSource } from "../../AsyncState";
import { mockDateNow } from "../utils/setup";
import { expect } from "@jest/globals";

mockDateNow();
describe("AsyncState instance creation", () => {
  function bootHydration(data: any) {
    eval(data);
  }

  it("should boot instance state from hydrated content", () => {
    if (!maybeWindow) {
      throw new Error("No globalThis");
    }
    bootHydration(
      'window.__$$=Object.assign(window.__$$_HD||{},{"state-1":[{"status":"success","timestamp":1487076708000,"props":{"args":[42],"payload":{}},"data":42},null,null]})'
    );
    let instance = new AsyncState("state-1", null);
    expect(instance.actions.getVersion()).toBe(0);
    expect(instance.actions.getState().data).toBe(42);
    expect(instance.actions.getState().status).toBe("success");
    expect(instance.lastSuccess).toBe(instance.actions.getState());
    bootHydration(
      'window.__$$=Object.assign(window.__$$_HD||{},{"state-2":[{"status":"error","timestamp":1487076708000,"props":{"args":[42],"payload":{}},"data":42},null,null]})'
    );
    let instance2 = new AsyncState("state-2", null, { initialValue: 15 });
    expect(instance2.actions.getState().data).toBe(42);
    expect(instance2.actions.getState().status).toBe("error");
    expect(instance2.lastSuccess.data).toBe(15);
    expect(instance2.lastSuccess.status).toBe("initial");
  });
  it("should initialize state from cache and invalidate it", () => {
    let persistSpy = jest.fn();
    let instance = new AsyncState("state-3", (props) => props.args[0], {
      initialValue(cache) {
        return cache?.stateHash.state.data;
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
                status: "success",
                data: 55,
                props: { args: [55], payload: {} },
              },
            },
            stateHash2: {
              addedAt: Date.now(),
              deadline: Date.now() + 1000,
              state: {
                timestamp: Date.now(),
                status: "success",
                data: 66,
                props: { args: [66], payload: {} },
              },
            },
          };
        },
        persist() {
          persistSpy.apply(null, arguments);
        },
      },
    });

    expect(instance.actions.getState().status).toBe("initial");
    expect(instance.actions.getState().data).toBe(55);

    let prevCache1 = instance.cache!.stateHash;

    instance.actions.replaceCache("stateHash", { ...prevCache1 });
    expect(instance.cache!.stateHash).not.toBe(prevCache1);

    persistSpy.mockClear();
    expect(instance.cache!.stateHash).not.toBe(undefined);
    expect(instance.cache!.stateHash2).not.toBe(undefined);
    instance.actions.invalidateCache("stateHash");
    expect(persistSpy).toHaveBeenCalledTimes(1);
    expect(instance.cache!.stateHash).toBe(undefined);
    expect(instance.cache!.stateHash2).not.toBe(undefined);

    persistSpy.mockClear();
    instance.actions.invalidateCache();
    expect(persistSpy).toHaveBeenCalledTimes(1);
    expect(instance.cache!.stateHash).toBe(undefined);
    expect(instance.cache!.stateHash2).toBe(undefined);
  });

  it("should update given configuration", () => {
    let instance = new AsyncState("state-4", null, { initialValue: 15 });
    expect(instance.actions.getConfig().initialValue).toBe(15);
    instance.actions.patchConfig({ initialValue: 16 });
    expect(instance.actions.getConfig().initialValue).toBe(16);
  });
  it("should update given configuration function", () => {
    let instance = new AsyncState("state-41", null, {
      initialValue: 15,
      skipPendingDelayMs: 300,
      cacheConfig: { enabled: true },
    });
    expect(instance.actions.getConfig().initialValue).toBe(15);
    let prevConfig;
    instance.actions.patchConfig((prev) => {
      prevConfig = prev;
      return {
        ...prev,
        keepPendingForMs: 300,
      };
    });
    expect(prevConfig).toEqual({
      initialValue: 15,
      skipPendingDelayMs: 300,
      cacheConfig: { enabled: true },
    });
    expect(instance.actions.getConfig()).toEqual({
      initialValue: 15,
      keepPendingForMs: 300,
      skipPendingDelayMs: 300,
      cacheConfig: { enabled: true },
    });
  });
  it("should answer correctly for hasLane and delete lane", () => {
    let instance = new AsyncState("state-5", null);
    // expect(instance._source.removeLane()).toBe(false);
    // expect(instance._source.hasLane("notfound")).toBe(false);
    instance.actions.getLane("toBeForgotten");
    expect(instance.actions.hasLane("toBeForgotten")).toBe(true);

    expect(instance.actions.removeLane("toBeForgotten")).toBe(true);
    expect(instance.actions.hasLane("toBeForgotten")).toBe(false);
  });
  it("should return main instance on getLane", () => {
    let instance = new AsyncState("state-6", null);
    expect(instance.actions.getLane()).toBe(instance.actions);
  });
  it("should return all lanes", () => {
    let instance = new AsyncState("state-8", null);
    expect(instance.actions.getAllLanes()).toEqual([]);
    let secondSrc = instance.actions.getLane("toForget");
    expect(instance.actions.getAllLanes()).toEqual([secondSrc]);
  });
  it("should get source by all ways", () => {
    let src = createSource({ key: "state-9" });
    expect(src.key).toEqual("state-9");
    expect(getSource("state-9")).toBe(src);

    let prevConsoleError = console.error;
    console.error = () => {}; // shut warning
    expect(getSource("state-9")).toBe(src);
    expect(createSource("state-9")).toBe(src);
    console.error = prevConsoleError;
  });
});
