import {getFlagsFromConfig} from "../../react/useAsyncStateBase";
import {
  AUTO_RUN, CONFIG_FUNCTION, CONFIG_OBJECT, CONFIG_SOURCE,
  CONFIG_STRING, FORK, HOIST, INSIDE_PROVIDER, LANE, SOURCE,
  STANDALONE, WAIT
} from "../../react/StateHookFlags";
import {AsyncStateManager, createSource} from "../../async-state";

describe('getFlagsFromConfig', () => {
  describe('get flags from config outside provider', () => {
    it('should correctly infer configuration from key: -- string --', () => {
      expect(getFlagsFromConfig("key", null))
        .toEqual(CONFIG_STRING | STANDALONE);

      expect(getFlagsFromConfig("key", null, {
        lazy: false,
        hoistToProvider: true
      }))
        .toEqual(CONFIG_STRING | AUTO_RUN | HOIST);

      expect(getFlagsFromConfig("key", null, {fork: true}))
        .toEqual(CONFIG_STRING | STANDALONE | FORK);

      expect(getFlagsFromConfig("key", null, {lane: "lane"}))
        .toEqual(CONFIG_STRING | STANDALONE | LANE);
    });
    it('should correctly infer configuration from key: -- object with key --', () => {
      let key = "key"

      expect(getFlagsFromConfig({key}, null))
        .toEqual(CONFIG_OBJECT | STANDALONE);

      expect(getFlagsFromConfig({key, lazy: false, hoistToProvider: true}, null))
        .toEqual(CONFIG_OBJECT | AUTO_RUN | HOIST);

      expect(getFlagsFromConfig({key}, null, {fork: true}))
        .toEqual(CONFIG_OBJECT | STANDALONE | FORK);

      expect(getFlagsFromConfig({key, lane: "lane"}, null))
        .toEqual(CONFIG_OBJECT | STANDALONE | LANE);

      expect(getFlagsFromConfig({key, producer: () => 5}, null, {lazy: false}))
        .toEqual(CONFIG_OBJECT | STANDALONE | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- source --', () => {
      let source = createSource("tmp");

      expect(getFlagsFromConfig(source, null))
        .toEqual(CONFIG_SOURCE | SOURCE);

      expect(getFlagsFromConfig(source, null, {lazy: false}))
        .toEqual(CONFIG_SOURCE | SOURCE | AUTO_RUN);

      expect(getFlagsFromConfig(source, null, {fork: true}))
        .toEqual(CONFIG_SOURCE | SOURCE | FORK);

      expect(getFlagsFromConfig(source, null, {lane: "lane"}))
        .toEqual(CONFIG_SOURCE | SOURCE | LANE);

      expect(getFlagsFromConfig(source, null, {producer: () => 5, lazy: false}))
        .toEqual(CONFIG_SOURCE | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- object with source --', () => {
      let source = createSource("tmp");

      expect(getFlagsFromConfig({source}, null))
        .toEqual(CONFIG_OBJECT | SOURCE);

      expect(getFlagsFromConfig({source}, null, {lazy: false}))
        .toEqual(CONFIG_OBJECT | SOURCE | AUTO_RUN);

      expect(getFlagsFromConfig({source}, null, {fork: true}))
        .toEqual(CONFIG_OBJECT | SOURCE | FORK);

      expect(getFlagsFromConfig({source}, null, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | SOURCE | LANE);

      expect(getFlagsFromConfig({source, producer: () => 5, lazy: false}, null))
        .toEqual(CONFIG_OBJECT | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from producer: -- producer --', () => {
      let producer = () => 5;

      expect(getFlagsFromConfig(producer, null))
        .toEqual(CONFIG_FUNCTION | STANDALONE);

      expect(getFlagsFromConfig(producer, null, {lazy: false}))
        .toEqual(CONFIG_FUNCTION | STANDALONE | AUTO_RUN);

      expect(getFlagsFromConfig(producer, null, {fork: true}))
        .toEqual(CONFIG_FUNCTION | STANDALONE | FORK);

      expect(getFlagsFromConfig(producer, null, {lane: "lane"}))
        .toEqual(CONFIG_FUNCTION | STANDALONE | LANE);
    });
    it('should correctly infer configuration from producer: -- object with producer --', () => {
      let producer = () => 5;

      expect(getFlagsFromConfig({producer}, null))
        .toEqual(CONFIG_OBJECT | STANDALONE);

      expect(getFlagsFromConfig({producer}, null, {lazy: false}))
        .toEqual(CONFIG_OBJECT | STANDALONE | AUTO_RUN);

      expect(getFlagsFromConfig({producer}, null, {fork: true}))
        .toEqual(CONFIG_OBJECT | STANDALONE | FORK);

      expect(getFlagsFromConfig({producer}, null, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | STANDALONE | LANE);
    });
    it('should correctly infer configuration from object: -- remaining cases  --', () => {

      expect(getFlagsFromConfig({
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

      expect(getFlagsFromConfig("key", manager))
        .toEqual(CONFIG_STRING | INSIDE_PROVIDER);

      expect(getFlagsFromConfig("not-existing", manager))
        .toEqual(CONFIG_STRING | INSIDE_PROVIDER | WAIT);

      expect(getFlagsFromConfig("key", manager, {
        lazy: false,
        hoistToProvider: true
      }))
        .toEqual(CONFIG_STRING | INSIDE_PROVIDER | HOIST | AUTO_RUN);

      expect(getFlagsFromConfig("key", manager, {fork: true}))
        .toEqual(CONFIG_STRING | INSIDE_PROVIDER | FORK);

      expect(getFlagsFromConfig("key", manager, {lane: "lane"}))
        .toEqual(CONFIG_STRING | INSIDE_PROVIDER | LANE);
    });
    it('should correctly infer configuration from key: -- object with key --', () => {
      let key = "key";
      let manager = AsyncStateManager({key: {key}});

      expect(getFlagsFromConfig({key}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER);
      expect(getFlagsFromConfig({key: "not-existing", lazy: false}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | WAIT | AUTO_RUN);

      expect(getFlagsFromConfig({key, lazy: false, hoistToProvider: true}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | AUTO_RUN | HOIST);

      expect(getFlagsFromConfig({key}, manager, {fork: true}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | FORK);

      expect(getFlagsFromConfig({key, lane: "lane"}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | LANE);

      expect(getFlagsFromConfig({key, producer: () => 5}, manager, {lazy: false}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- source --', () => {
      let source = createSource("tmp");
      let manager = AsyncStateManager({key: source});

      expect(getFlagsFromConfig(source, manager))
        .toEqual(CONFIG_SOURCE | INSIDE_PROVIDER | SOURCE);

      expect(getFlagsFromConfig(source, manager, {lazy: false}))
        .toEqual(CONFIG_SOURCE | INSIDE_PROVIDER | SOURCE | AUTO_RUN);

      expect(getFlagsFromConfig(source, manager, {fork: true}))
        .toEqual(CONFIG_SOURCE | INSIDE_PROVIDER | SOURCE | FORK);

      expect(getFlagsFromConfig(source, manager, {lane: "lane"}))
        .toEqual(CONFIG_SOURCE | INSIDE_PROVIDER | SOURCE | LANE);

      expect(getFlagsFromConfig(source, manager, {producer: () => 5, lazy: false}))
        .toEqual(CONFIG_SOURCE | INSIDE_PROVIDER | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- object with source --', () => {
      let source = createSource("tmp");
      let manager = AsyncStateManager({key: source});

      expect(getFlagsFromConfig({source}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | SOURCE);

      expect(getFlagsFromConfig({source}, manager, {lazy: false}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | SOURCE | AUTO_RUN);

      expect(getFlagsFromConfig({source}, manager, {fork: true}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | SOURCE | FORK);

      expect(getFlagsFromConfig({source}, manager, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | SOURCE | LANE);

      expect(getFlagsFromConfig({source, producer: () => 5, lazy: false}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from producer: -- producer --', () => {
      let producer = () => 5;
      let manager = AsyncStateManager({key: {key: "key", producer}});

      expect(getFlagsFromConfig(producer, manager))
        .toEqual(CONFIG_FUNCTION | INSIDE_PROVIDER | STANDALONE);

      expect(getFlagsFromConfig(producer, manager, {lazy: false}))
        .toEqual(CONFIG_FUNCTION | INSIDE_PROVIDER | STANDALONE | AUTO_RUN);

      expect(getFlagsFromConfig(producer, manager, {fork: true}))
        .toEqual(CONFIG_FUNCTION | INSIDE_PROVIDER | STANDALONE | FORK);

      expect(getFlagsFromConfig(producer, manager, {lane: "lane"}))
        .toEqual(CONFIG_FUNCTION | INSIDE_PROVIDER | STANDALONE | LANE);
    });
    it('should correctly infer configuration from producer: -- object with producer --', () => {
      let producer = () => 5;
      let manager = AsyncStateManager({key: {key: "key", producer}});

      expect(getFlagsFromConfig({producer}, manager))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | STANDALONE);

      expect(getFlagsFromConfig({producer}, manager, {lazy: false}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | STANDALONE | AUTO_RUN);

      expect(getFlagsFromConfig({producer}, manager, {fork: true}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | STANDALONE | FORK);

      expect(getFlagsFromConfig({producer}, manager, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | STANDALONE | LANE);

      // listen to the existing!
      expect(getFlagsFromConfig({key: "key", producer}, manager, {hoistToProvider: true}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | HOIST);

      expect(getFlagsFromConfig({key: "key2", producer}, manager, {hoistToProvider: true}))
        .toEqual(CONFIG_OBJECT | INSIDE_PROVIDER | HOIST);
    });
    it('should correctly infer configuration from object: -- remaining cases  --', () => {

      let manager = AsyncStateManager({key: {key: "key"}});

      expect(getFlagsFromConfig({
        key: "test",
        payload: {},
        lazy: false,
        producer: () => 5,
      }, manager))
        .toEqual(CONFIG_OBJECT | AUTO_RUN | INSIDE_PROVIDER | WAIT);

      expect(getFlagsFromConfig({
        key: "key",
        payload: {},
        lazy: false,
        producer: () => 5,
      }, manager))
        .toEqual(CONFIG_OBJECT | AUTO_RUN | INSIDE_PROVIDER);

    });
  });

});
