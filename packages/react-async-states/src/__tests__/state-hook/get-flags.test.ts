import {
  AUTO_RUN,
  CHANGE_EVENTS,
  CONFIG_FUNCTION,
  CONFIG_OBJECT,
  CONFIG_SOURCE,
  CONFIG_STRING,
  FORK,
  LANE,
  SOURCE,
  SUBSCRIBE_EVENTS,
  WAIT
} from "../../state-hook/StateHookFlags";
import {resolveFlags} from "../../state-hook/StateHook";
import {createSource, requestContext} from "async-states";

describe('resolveFlags', () => {
  let pool = requestContext(null).getOrCreatePool();
  describe('get flags from config outside provider', () => {
    it('should correctly infer configuration from key: -- string --', () => {
      expect(resolveFlags("key", pool))
        .toEqual(CONFIG_STRING);

      expect(resolveFlags("key", pool, {
        lazy: false,
      }))
        .toEqual(CONFIG_STRING | AUTO_RUN);

      expect(resolveFlags("key", pool, {fork: true}))
        .toEqual(CONFIG_STRING | FORK);

      expect(resolveFlags("key", pool, {lane: "lane"}))
        .toEqual(CONFIG_STRING | LANE);
    });
    it('should correctly infer configuration from key: -- object with key --', () => {
      let key = "key"

      expect(resolveFlags({key}, pool))
        .toEqual(CONFIG_OBJECT);

      expect(resolveFlags({key, lazy: false, }, pool))
        .toEqual(CONFIG_OBJECT | AUTO_RUN);

      expect(resolveFlags({key}, pool, {fork: true}))
        .toEqual(CONFIG_OBJECT | FORK);

      expect(resolveFlags({key, lane: "lane"}, pool))
        .toEqual(CONFIG_OBJECT | LANE);

      expect(resolveFlags({key, producer: () => 5}, pool, {lazy: false}))
        .toEqual(CONFIG_OBJECT | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- source --', () => {
      let source = createSource("tmp");

      expect(resolveFlags(source, pool))
        .toEqual(CONFIG_SOURCE | SOURCE);

      expect(resolveFlags(source, pool, {lazy: false}))
        .toEqual(CONFIG_SOURCE | SOURCE | AUTO_RUN);

      expect(resolveFlags(source, pool, {fork: true}))
        .toEqual(CONFIG_SOURCE | SOURCE | FORK);

      expect(resolveFlags(source, pool, {lane: "lane"}))
        .toEqual(CONFIG_SOURCE | SOURCE | LANE);

      expect(resolveFlags(source, pool, {producer: () => 5, lazy: false}))
        .toEqual(CONFIG_SOURCE | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- object with source --', () => {
      let source = createSource("tmp2");

      expect(resolveFlags({source}, pool))
        .toEqual(CONFIG_OBJECT | SOURCE);

      expect(resolveFlags({source}, pool, {lazy: false}))
        .toEqual(CONFIG_OBJECT | SOURCE | AUTO_RUN);

      expect(resolveFlags({source}, pool, {fork: true}))
        .toEqual(CONFIG_OBJECT | SOURCE | FORK);

      expect(resolveFlags({source}, pool, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | SOURCE | LANE);

      expect(resolveFlags({source, producer: () => 5, lazy: false}, pool))
        .toEqual(CONFIG_OBJECT | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from producer: -- producer --', () => {
      let producer = () => 5;

      expect(resolveFlags(producer, pool))
        .toEqual(CONFIG_FUNCTION);

      expect(resolveFlags(producer, pool, {lazy: false}))
        .toEqual(CONFIG_FUNCTION | AUTO_RUN);

      expect(resolveFlags(producer, pool, {fork: true}))
        .toEqual(CONFIG_FUNCTION | FORK);

      expect(resolveFlags(producer, pool, {lane: "lane"}))
        .toEqual(CONFIG_FUNCTION | LANE);
    });
    it('should correctly infer configuration from producer: -- object with producer --', () => {
      let producer = () => 5;

      expect(resolveFlags({producer}, pool))
        .toEqual(CONFIG_OBJECT);

      expect(resolveFlags({producer}, pool, {lazy: false}))
        .toEqual(CONFIG_OBJECT | AUTO_RUN);

      expect(resolveFlags({producer}, pool, {fork: true}))
        .toEqual(CONFIG_OBJECT | FORK);

      expect(resolveFlags({producer}, pool, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | LANE);
    });
    it('should correctly infer configuration from object: -- remaining cases  --', () => {

      expect(resolveFlags({
        key: "test",
        payload: {},
        lazy: false,
        producer: () => 5,
      }, pool))
        .toEqual(CONFIG_OBJECT | AUTO_RUN);

    });
  });

  describe('get flags from config inside provider', () => {
    it('should correctly infer configuration from key: -- string --', () => {

      expect(resolveFlags("key", pool))
        .toEqual(CONFIG_STRING);

      expect(resolveFlags("not-existing", pool, {wait: true}))
        .toEqual(CONFIG_STRING | WAIT);

      expect(resolveFlags("key", pool, {
        lazy: false,

      }))
        .toEqual(CONFIG_STRING | AUTO_RUN);

      expect(resolveFlags("key", pool, {fork: true}))
        .toEqual(CONFIG_STRING | FORK);

      expect(resolveFlags("key", pool, {lane: "lane"}))
        .toEqual(CONFIG_STRING | LANE);
    });
    it('should correctly infer configuration from key: -- object with key --', () => {
      let key = "key";

      expect(resolveFlags({key}, pool))
        .toEqual(CONFIG_OBJECT);
      expect(resolveFlags({key: "not-existing", lazy: false}, pool, {wait: true}))
        .toEqual(CONFIG_OBJECT | WAIT | AUTO_RUN);

      expect(resolveFlags({key, lazy: false, }, pool))
        .toEqual(CONFIG_OBJECT | AUTO_RUN);

      expect(resolveFlags({key}, pool, {fork: true}))
        .toEqual(CONFIG_OBJECT | FORK);

      expect(resolveFlags({key, lane: "lane"}, pool))
        .toEqual(CONFIG_OBJECT | LANE);

      expect(resolveFlags({key, producer: () => 5}, pool, {lazy: false}))
        .toEqual(CONFIG_OBJECT | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- source --', () => {
      let source = createSource("tmp3");

      expect(resolveFlags(source, pool))
        .toEqual(CONFIG_SOURCE | SOURCE);

      expect(resolveFlags(source, pool, {lazy: false}))
        .toEqual(CONFIG_SOURCE | SOURCE | AUTO_RUN);

      expect(resolveFlags(source, pool, {fork: true}))
        .toEqual(CONFIG_SOURCE | SOURCE | FORK);

      expect(resolveFlags(source, pool, {lane: "lane"}))
        .toEqual(CONFIG_SOURCE | SOURCE | LANE);

      expect(resolveFlags(source, pool, {producer: () => 5, lazy: false}))
        .toEqual(CONFIG_SOURCE | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from source: -- object with source --', () => {
      let source = createSource("tmp4");

      expect(resolveFlags({source}, pool))
        .toEqual(CONFIG_OBJECT | SOURCE);

      expect(resolveFlags({source}, pool, {lazy: false}))
        .toEqual(CONFIG_OBJECT | SOURCE | AUTO_RUN);

      expect(resolveFlags({source}, pool, {fork: true}))
        .toEqual(CONFIG_OBJECT | SOURCE | FORK);

      expect(resolveFlags({source}, pool, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | SOURCE | LANE);

      expect(resolveFlags({source, producer: () => 5, lazy: false}, pool))
        .toEqual(CONFIG_OBJECT | SOURCE | AUTO_RUN);
    });
    it('should correctly infer configuration from producer: -- producer --', () => {
      let producer = () => 5;

      expect(resolveFlags(producer, pool))
        .toEqual(CONFIG_FUNCTION);

      expect(resolveFlags(producer, pool, {lazy: false}))
        .toEqual(CONFIG_FUNCTION | AUTO_RUN);

      expect(resolveFlags(producer, pool, {fork: true}))
        .toEqual(CONFIG_FUNCTION | FORK);

      expect(resolveFlags(producer, pool, {lane: "lane"}))
        .toEqual(CONFIG_FUNCTION | LANE);
    });
    it('should correctly infer configuration from producer: -- object with producer --', () => {
      let producer = () => 5;

      expect(resolveFlags({producer}, pool))
        .toEqual(CONFIG_OBJECT);

      expect(resolveFlags({producer}, pool, {lazy: false}))
        .toEqual(CONFIG_OBJECT | AUTO_RUN);

      expect(resolveFlags({producer}, pool, {fork: true}))
        .toEqual(CONFIG_OBJECT | FORK);

      expect(resolveFlags({producer}, pool, {lane: "lane"}))
        .toEqual(CONFIG_OBJECT | LANE);

      // listen to the existing!
      expect(resolveFlags({key: "key", producer}, pool, {}))
        .toEqual(CONFIG_OBJECT);

      expect(resolveFlags({key: "key2", producer}, pool, {}))
        .toEqual(CONFIG_OBJECT);
    });
    it('should correctly infer configuration from object: -- remaining cases  --', () => {

      expect(resolveFlags({
        key: "test",
        payload: {},
        lazy: false,
        producer: () => 5,
      }, pool, {wait: true}))
        .toEqual(CONFIG_OBJECT | AUTO_RUN | WAIT);

      expect(resolveFlags({
        key: "key",
        payload: {},
        lazy: false,
        producer: () => 5,
      }, pool))
        .toEqual(CONFIG_OBJECT | AUTO_RUN);

    });
    it('should infer flags from overrides object', () => {
      expect(resolveFlags({
        key: "test",
        payload: {},
        producer: () => 5,
      }, pool, {lazy: false, events: {
          change: () => {},
          subscribe: () => () => {},
        }}))
        .toEqual(CONFIG_OBJECT | AUTO_RUN | CHANGE_EVENTS | SUBSCRIBE_EVENTS);
    });
  });

});
