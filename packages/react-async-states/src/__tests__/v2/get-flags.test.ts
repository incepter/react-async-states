import {
  AUTO_RUN,
  CONFIG_FUNCTION,
  CONFIG_OBJECT,
  CONFIG_SOURCE,
  CONFIG_STRING,
  FORK,
  HOIST,
  INSIDE_PROVIDER,
  LANE,
  SOURCE,
  STANDALONE,
  WAIT
} from "../../StateHookFlags";
import {AsyncStateManager, createSource} from "async-states-core";
import {resolveFlags} from "../../StateHook";

describe('resolveFlags', () => {
  describe('get flags from config outside provider', () => {
    it('should correctly infer configuration from key: -- string --', () => {
      expect(resolveFlags("key", null))
        .toEqual(CONFIG_STRING | STANDALONE);

      expect(resolveFlags("key", null, {
        lazy: false,
        hoist: true
      }))
        .toEqual(CONFIG_STRING | AUTO_RUN | HOIST);

      expect(resolveFlags("key", null, {fork: true}))
        .toEqual(CONFIG_STRING | STANDALONE | FORK);

      expect(resolveFlags("key", null, {lane: "lane"}))
        .toEqual(CONFIG_STRING | STANDALONE | LANE);
    });
    it('should correctly infer configuration from key: -- object with key --', () => {
      let key = "key"

      expect(resolveFlags({key}, null))
        .toEqual(CONFIG_OBJECT | STANDALONE);

      expect(resolveFlags({key, lazy: false, hoist: true}, null))
        .toEqual(CONFIG_OBJECT | AUTO_RUN | HOIST);

      expect(resolveFlags({key}, null, {fork: true}))
        .toEqual(CONFIG_OBJECT | STANDALONE | FORK);

      expect(resolveFlags({key, lane: "lane"}, null))
        .toEqual(CONFIG_OBJECT | STANDALONE | LANE);

      expect(resolveFlags({key, producer: () => 5}, null, {lazy: false}))
        .toEqual(CONFIG_OBJECT | STANDALONE | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- source --', () => {
      let source = createSource("tmp");

      expect(resolveFlags(source, null))
        .toEqual(CONFIG_SOURCE | SOURCE);

      expect(resolveFlags(source, null, {lazy: false}))
        .toEqual(CONFIG_SOURCE | SOURCE | AUTO_RUN);

      expect(resolveFlags(source, null, {fork: true}))
        .toEqual(CONFIG_SOURCE | SOURCE | FORK);

      expect(resolveFlags(source, null, {lane: "lane"}))
        .toEqual(CONFIG_SOURCE | SOURCE | LANE);

      expect(resolveFlags(source, null, {producer: () => 5, lazy: false}))
        .toEqual(CONFIG_SOURCE | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- object with source --', () => {
      let source = createSource("tmp");

      expect(resolveFlags({source}, null))
        .toEqual(CONFIG_OBJECT | SOURCE);

      expect(resolveFlags({source}, null, {lazy: false}))
        .toEqual(CONFIG_OBJECT | SOURCE | AUTO_RUN);

      expect(resolveFlags({source}, null, {fork: true}))
        .toEqual(CONFIG_OBJECT | SOURCE | FORK);

      expect(resolveFlags({source}, null, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | SOURCE | LANE);

      expect(resolveFlags({source, producer: () => 5, lazy: false}, null))
        .toEqual(CONFIG_OBJECT | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from producer: -- producer --', () => {
      let producer = () => 5;

      expect(resolveFlags(producer, null))
        .toEqual(CONFIG_FUNCTION | STANDALONE);

      expect(resolveFlags(producer, null, {lazy: false}))
        .toEqual(CONFIG_FUNCTION | STANDALONE | AUTO_RUN);

      expect(resolveFlags(producer, null, {fork: true}))
        .toEqual(CONFIG_FUNCTION | STANDALONE | FORK);

      expect(resolveFlags(producer, null, {lane: "lane"}))
        .toEqual(CONFIG_FUNCTION | STANDALONE | LANE);
    });
    it('should correctly infer configuration from producer: -- object with producer --', () => {
      let producer = () => 5;

      expect(resolveFlags({producer}, null))
        .toEqual(CONFIG_OBJECT | STANDALONE);

      expect(resolveFlags({producer}, null, {lazy: false}))
        .toEqual(CONFIG_OBJECT | STANDALONE | AUTO_RUN);

      expect(resolveFlags({producer}, null, {fork: true}))
        .toEqual(CONFIG_OBJECT | STANDALONE | FORK);

      expect(resolveFlags({producer}, null, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | STANDALONE | LANE);
    });
    it('should correctly infer configuration from object: -- remaining cases  --', () => {

      expect(resolveFlags({
        key: "test",
        payload: {},
        lazy: false,
        producer: () => 5,
      }, null))
        .toEqual(CONFIG_OBJECT | AUTO_RUN | STANDALONE);

    });
  });

  describe('get flags from config inside provider', () => {
    it('should correctly infer configuration from key: -- string --', () => {
      let manager = AsyncStateManager({key: {key: "key"}});

      expect(resolveFlags("key", manager))
        .toEqual(CONFIG_STRING | INSIDE_PROVIDER);

      expect(resolveFlags("not-existing", manager))
        .toEqual(CONFIG_STRING | INSIDE_PROVIDER | WAIT);

      expect(resolveFlags("key", manager, {
        lazy: false,
        hoist: true
      }))
        .toEqual(CONFIG_STRING | INSIDE_PROVIDER | HOIST | AUTO_RUN);

      expect(resolveFlags("key", manager, {fork: true}))
        .toEqual(CONFIG_STRING | INSIDE_PROVIDER | FORK);

      expect(resolveFlags("key", manager, {lane: "lane"}))
        .toEqual(CONFIG_STRING | INSIDE_PROVIDER | LANE);
    });
    it('should correctly infer configuration from key: -- object with key --', () => {
      let key = "key";
      let manager = AsyncStateManager({key: {key}});

      expect(resolveFlags({key}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER);
      expect(resolveFlags({key: "not-existing", lazy: false}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | WAIT | AUTO_RUN);

      expect(resolveFlags({key, lazy: false, hoist: true}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | AUTO_RUN | HOIST);

      expect(resolveFlags({key}, manager, {fork: true}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | FORK);

      expect(resolveFlags({key, lane: "lane"}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | LANE);

      expect(resolveFlags({key, producer: () => 5}, manager, {lazy: false}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- source --', () => {
      let source = createSource("tmp");
      let manager = AsyncStateManager({key: source});

      expect(resolveFlags(source, manager))
        .toEqual(CONFIG_SOURCE | INSIDE_PROVIDER | SOURCE);

      expect(resolveFlags(source, manager, {lazy: false}))
        .toEqual(CONFIG_SOURCE | INSIDE_PROVIDER | SOURCE | AUTO_RUN);

      expect(resolveFlags(source, manager, {fork: true}))
        .toEqual(CONFIG_SOURCE | INSIDE_PROVIDER | SOURCE | FORK);

      expect(resolveFlags(source, manager, {lane: "lane"}))
        .toEqual(CONFIG_SOURCE | INSIDE_PROVIDER | SOURCE | LANE);

      expect(resolveFlags(source, manager, {producer: () => 5, lazy: false}))
        .toEqual(CONFIG_SOURCE | INSIDE_PROVIDER | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- object with source --', () => {
      let source = createSource("tmp");
      let manager = AsyncStateManager({key: source});

      expect(resolveFlags({source}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | SOURCE);

      expect(resolveFlags({source}, manager, {lazy: false}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | SOURCE | AUTO_RUN);

      expect(resolveFlags({source}, manager, {fork: true}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | SOURCE | FORK);

      expect(resolveFlags({source}, manager, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | SOURCE | LANE);

      expect(resolveFlags({source, producer: () => 5, lazy: false}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from producer: -- producer --', () => {
      let producer = () => 5;
      let manager = AsyncStateManager({key: {key: "key", producer}});

      expect(resolveFlags(producer, manager))
        .toEqual(CONFIG_FUNCTION | INSIDE_PROVIDER | STANDALONE);

      expect(resolveFlags(producer, manager, {lazy: false}))
        .toEqual(CONFIG_FUNCTION | INSIDE_PROVIDER | STANDALONE | AUTO_RUN);

      expect(resolveFlags(producer, manager, {fork: true}))
        .toEqual(CONFIG_FUNCTION | INSIDE_PROVIDER | STANDALONE | FORK);

      expect(resolveFlags(producer, manager, {lane: "lane"}))
        .toEqual(CONFIG_FUNCTION | INSIDE_PROVIDER | STANDALONE | LANE);
    });
    it('should correctly infer configuration from producer: -- object with producer --', () => {
      let producer = () => 5;
      let manager = AsyncStateManager({key: {key: "key", producer}});

      expect(resolveFlags({producer}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | STANDALONE);

      expect(resolveFlags({producer}, manager, {lazy: false}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | STANDALONE | AUTO_RUN);

      expect(resolveFlags({producer}, manager, {fork: true}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | STANDALONE | FORK);

      expect(resolveFlags({producer}, manager, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | STANDALONE | LANE);

      // listen to the existing!
      expect(resolveFlags({key: "key", producer}, manager, {hoist: true}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | HOIST);

      expect(resolveFlags({key: "key2", producer}, manager, {hoist: true}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | HOIST);
    });
    it('should correctly infer configuration from object: -- remaining cases  --', () => {

      let manager = AsyncStateManager({key: {key: "key"}});

      expect(resolveFlags({
        key: "test",
        payload: {},
        lazy: false,
        producer: () => 5,
      }, manager))
        .toEqual(CONFIG_OBJECT | AUTO_RUN | INSIDE_PROVIDER | WAIT);

      expect(resolveFlags({
        key: "key",
        payload: {},
        lazy: false,
        producer: () => 5,
      }, manager))
        .toEqual(CONFIG_OBJECT | AUTO_RUN | INSIDE_PROVIDER);

    });
  });

});
