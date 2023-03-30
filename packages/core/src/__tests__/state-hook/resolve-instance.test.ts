import {resolveFlags, resolveInstance} from "../../state-hook/StateHook";
import {createContext} from "../../pool";
import {readSource, Sources} from "../../AsyncState";


describe('StateHook resolveInstance', () => {
  it('should return null when waiting for the instance', () => {
    let config = {key: "key", wait: true}
    let usedPool = createContext({}).getOrCreatePool()

    let instance = resolveInstance(usedPool, resolveFlags(config, usedPool), config)
    expect(instance).toBe(null)
  });
  it('should correctly resolve instance from source configuration', () => {
    let src = Sources.for("key1")
    let usedPool = createContext({}).getOrCreatePool()
    let config = src

    let instance = resolveInstance(usedPool, resolveFlags(config, usedPool), config)
    expect(instance!.key).toBe("key1")
    expect(instance!._source).toBe(src)
  });
  it('should correctly resolve instance from source property configuration', () => {
    let src = Sources.for("key2")
    let usedPool = createContext({}).getOrCreatePool()
    let config = {source: src}

    let instance = resolveInstance(usedPool, resolveFlags(config, usedPool), config)
    expect(instance!.key).toBe("key2")
    expect(instance!._source).toBe(src)
  });
  it('should correctly resolve instance from forked source', () => {
    let src = Sources.for("key3")
    let usedPool = createContext({}).getOrCreatePool()
    let config = {source: src, fork: true, forkConfig: {key: "test-fork"}}

    let instance = resolveInstance(usedPool, resolveFlags(config, usedPool), config)
    expect(instance!.key).toBe("test-fork")
    expect(instance!._source).not.toBe(src)
  });
  it('should correctly resolve instance from lane source', () => {
    let src = Sources.for("key4")
    let lane = src.getLaneSource("lane")
    let usedPool = createContext({}).getOrCreatePool()
    let config = {source: src, lane: "lane"}

    let instance = resolveInstance(usedPool, resolveFlags(config, usedPool), config)
    expect(instance!.key).toBe("lane")
    expect(instance!._source).toBe(lane)
    expect(instance!._source).not.toBe(src)
  });
  it('should correctly resolve standalone instance when not existing', () => {
    let usedPool = createContext({}).getOrCreatePool()
    let config = {key: "standalone1"}

    let instance = resolveInstance(usedPool, resolveFlags(config, usedPool), config)
    expect(instance!.key).toBe("standalone1")
  });
  it('should correctly resolve standalone instance when not existing and take a lane', () => {
    let usedPool = createContext({}).getOrCreatePool()
    let config = {key: "standalone1", lane: "std-lane"}

    let instance = resolveInstance(usedPool, resolveFlags(config, usedPool), config)
    expect(instance!.key).toBe("std-lane")
  });
  it('should correctly resolve standalone instance when already existing in pool', () => {
    let src = Sources.for("newOne")
    let usedPool = createContext({}).getOrCreatePool()
    usedPool.set(src.key, readSource(src))

    let config = {key: "newOne"}

    let instance = resolveInstance(usedPool, resolveFlags(config, usedPool), config)
    expect(instance!.key).toBe("newOne")
    expect(instance!._source).toBe(src)
  });
  it('should correctly resolve standalone instance when already existing in pool by fork', () => {
    let src = Sources.for("newOne1")
    let usedPool = createContext({}).getOrCreatePool()
    usedPool.set(src.key, readSource(src))

    let config = {key: "newOne1", fork: true, forkConfig: {key: "lala"}}

    let instance = resolveInstance(usedPool, resolveFlags(config, usedPool), config)
    expect(instance!.key).toBe("lala")
    expect(instance!._source).not.toBe(src)
  });
  it('should correctly resolve standalone instance when already existing in pool by lane', () => {
    let src = Sources.for("newOne2")
    let usedPool = createContext({}).getOrCreatePool()
    usedPool.set(src.key, readSource(src))

    let config = {key: "newOne2", lane: "some-lane"}

    let instance = resolveInstance(usedPool, resolveFlags(config, usedPool), config)
    expect(instance!.key).toBe("some-lane")
    expect(instance!._source).toBe(src.getLaneSource("some-lane"))
  });
  it('should correctly resolve standalone instance when already existing and patch producer', () => {
    let src = Sources.for("newOne3")
    let usedPool = createContext({}).getOrCreatePool()
    let inst = readSource(src);
    usedPool.set(src.key, inst)

    let config = {key: "newOne3", producer: () => {}}

    expect(inst!._producer).not.toBe(config.producer)
    let instance = resolveInstance(usedPool, resolveFlags(config, usedPool), config)
    expect(instance!.key).toBe("newOne3")
    expect(instance!._producer).toBe(config.producer)
  });
});
