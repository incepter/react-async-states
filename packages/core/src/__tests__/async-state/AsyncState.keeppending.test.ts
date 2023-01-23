import {AsyncState, ProducerConfig, Status} from "../..";
import {timeout} from "./test-utils";
import {expect} from "@jest/globals";

// @ts-ignore
jest.useFakeTimers("modern");
describe('AsyncState - keepPending', () => {
  it('should keep pending status in a normal way', async () => {
    // given
    let key = "keep-1";
    let producer = timeout(100);
    let myConfig: ProducerConfig<undefined> = {keepPendingForMs: 200};

    // when
    let instance = new AsyncState(key, producer, myConfig);

    // then
    expect(instance.state.status).toBe(Status.initial);
    instance.run();
    expect(instance.state.status).toBe(Status.pending);
    await jest.advanceTimersByTime(150); // producer resolves after 100
    expect(instance.state.status).toBe(Status.pending); // keepPending retains this
    await jest.advanceTimersByTime(50);
    expect(instance.state.status).toBe(Status.success);
  });
  it('should keep pending status and stack statuses updates', async () => {
    // given
    let key = "keep-2";
    let producer = timeout<number>(100, 0);
    let config: ProducerConfig<undefined> = {keepPendingForMs: 200};

    // when
    let instance = new AsyncState(key, producer, config);

    // then
    instance.run();
    await jest.advanceTimersByTime(50); // producer resolves after 100
    instance.abort();
    expect(instance.state.status).toBe(Status.pending);

    await jest.advanceTimersByTime(150);
    expect(instance.state.status).toBe(Status.aborted); // keepPending retains this


    // then
    instance.run();
    await jest.advanceTimersByTime(50); // producer resolves after 100
    instance.setState(1);
    expect(instance.state.status).toBe(Status.pending);

    await jest.advanceTimersByTime(150);
    expect(instance.state.data).toBe(1);

    // then
    instance.run();
    await jest.advanceTimersByTime(50); // producer resolves after 100
    instance.setState(2);
    instance.setState(prev => prev.data + 1);
    expect(instance.state.status).toBe(Status.pending);

    await jest.advanceTimersByTime(150);
    expect(instance.state.data).toBe(3);
  });
  it('should bailout pending update', async () => {
    // given
    let key = "keep-3";
    let producer = timeout<number>(100, 0);
    let config: ProducerConfig<undefined> = {keepPendingForMs: 200};

    // when
    let spy = jest.fn();
    let instance = new AsyncState(key, producer, config);
    instance.on("change", spy);

    // then
    instance.run();
    await jest.advanceTimersByTime(50); // producer resolves after 100
    instance.setState(2);
    instance.run();
    instance.setState(3);
    expect(instance.state.status).toBe(Status.pending);

    await jest.advanceTimersByTime(150);
    expect(instance.state.data).toBe(3);
    expect(instance.state.status).toBe(Status.success);

    let spyCalls = spy.mock.calls;
    expect(spyCalls.length).toBe(3);
    expect(spyCalls[0][0].status).toBe(Status.pending);
    expect(spyCalls[1][0].data).toBe(2);
    expect(spyCalls[2][0].status).toBe(Status.success);
  });
  it('should discard the update queue on dispose', async () => {
    // given
    let key = "keep-4";
    let producer = timeout<number>(100, 0);
    let config: ProducerConfig<number> = {keepPendingForMs: 200, initialValue: 1};

    // when
    let instance = new AsyncState(key, producer, config);

    // then
    instance.run();
    await jest.advanceTimersByTime(50); // producer resolves after 100
    instance.dispose();

    await jest.advanceTimersByTime(150);
    expect(instance.state.data).toBe(1);
    expect(instance.state.status).toBe(Status.initial);
  });
});
