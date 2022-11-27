import AsyncState, { Status } from "../../async-state";
import { shallowClone } from "../../shared";
import { act } from "@testing-library/react-hooks";
import { timeout } from "./test-utils";
import { mockDateNow, TESTS_TS } from "../react-async-state/utils/setup";
import {standaloneProducerEffectsCreator} from "../../async-state/AsyncState";

// @ts-ignore
jest.useFakeTimers("modern");
mockDateNow();
describe('AsyncState - fork', () => {
  it('should simulate async state and check fork count', () => {
    // given
    let key = "simulated";
    let producer = timeout(100, [{id: 1, description: "value"}]);
    let myConfig = {initialValue: null};

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);

    // then
    expect(myAsyncState.key).toBe(key);
    expect(myAsyncState.forksIndex).toBe(0);
    expect(myAsyncState.subscriptions).toBe(null);
    expect(typeof myAsyncState.run).toBe("function");
    expect(myAsyncState.config).toEqual(shallowClone(myConfig));
    expect(myAsyncState.lastSuccess).toEqual({props: null, data: null, status: Status.initial, timestamp: TESTS_TS});
    expect(myAsyncState.state).toEqual({data: null, status: Status.initial, props: null, timestamp: TESTS_TS});

    let forkedAsyncState = myAsyncState.fork();
    expect(myAsyncState.forksIndex).toBe(1);
    expect(forkedAsyncState.forksIndex).toBe(0);
    expect(forkedAsyncState.config).toEqual(myAsyncState.config);
    expect(forkedAsyncState.lastSuccess).toEqual(myAsyncState.lastSuccess);
    expect(forkedAsyncState.originalProducer).toBe(myAsyncState.originalProducer);


    expect(forkedAsyncState.key).not.toBe(myAsyncState.key);
    expect(forkedAsyncState.producer).not.toBe(myAsyncState.producer);
    expect(forkedAsyncState.state).not.toBe(myAsyncState.state);// not same reference even if retrieved
  });
  it('should fork and keep state after run', async () => {
    // given
    let key = "simulated";
    let producer = timeout(100, [{id: 1, description: "value"}]);
    let myConfig = {};

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);
    myAsyncState.run(standaloneProducerEffectsCreator);

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    expect(myAsyncState.state.status).toBe(Status.success); // make sure it resolved

    let forkedAsyncState = myAsyncState.fork({keepState: true});
    // then
    // make sure they are deeply equal, but not with same reference ;)
    expect(myAsyncState.lastSuccess).toEqual(forkedAsyncState.lastSuccess);
    expect(myAsyncState.lastSuccess).not.toBe(forkedAsyncState.lastSuccess);
    expect(myAsyncState.state).toEqual(forkedAsyncState.state);
    expect(myAsyncState.state).not.toBe(forkedAsyncState.state);
  });
  it('should fork and keep state before run', async () => {
    // given
    let key = "simulated";
    let producer = timeout(100, [{id: 1, description: "value"}]);
    let myConfig = {};

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);

    let forkedAsyncState = myAsyncState.fork({keepState: true});

    forkedAsyncState.run(() => {});

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    expect(forkedAsyncState.state.status).toBe(Status.success); // make sure it resolved

    // then
    expect(myAsyncState.lastSuccess).not.toEqual(forkedAsyncState.lastSuccess);// forked async state moved independently
    expect(myAsyncState.state).not.toBe(forkedAsyncState.state);
  });
});
