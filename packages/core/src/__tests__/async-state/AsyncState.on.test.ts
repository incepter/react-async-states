import {createSource, Status} from "../..";
import {expect} from "@jest/globals";

describe('instance.on events', () => {
  it('should register multiple change events', () => {
    // given
    let first = jest.fn();
    let second = jest.fn();
    let third = jest.fn();
    let source = createSource("on-change-tests");

    // when
    let removeFirst = source.on("change", first);
    let removeSecond = source.on("change", [{status: Status.success, handler: second}, third]);

    source.setState(1);
    // then
    expect(first).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0][0].data).toBe(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(second.mock.calls[0][0].data).toBe(1);
    expect(third).toHaveBeenCalledTimes(1);
    expect(third.mock.calls[0][0].data).toBe(1);
    first.mockClear();
    third.mockClear();
    second.mockClear();
    // then
    source.setState(1, Status.error);
    expect(first).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0][0].data).toBe(1);
    expect(second).not.toHaveBeenCalled();
    expect(third).toHaveBeenCalledTimes(1);
    expect(third.mock.calls[0][0].data).toBe(1);
    first.mockClear();
    third.mockClear();
    second.mockClear();
    // then
    removeFirst();
    source.setState(2, Status.success);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(second.mock.calls[0][0].data).toBe(2);
    expect(third).toHaveBeenCalledTimes(1);
    expect(third.mock.calls[0][0].data).toBe(2);
    first.mockClear();
    third.mockClear();
    second.mockClear();
    // then
    removeSecond();
    source.setState(3, Status.success);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(third).not.toHaveBeenCalled();
  });
  it('should register multiple dispose events', () => {
    // given
    let source = createSource("on-dispose-tests", null, {resetStateOnDispose: true});
    let first = jest.fn();
    let second = jest.fn();
    // when
    let removeFirst = source.on("dispose", first);
    let removeSecond = source.on("dispose", [second]);
    let unsubscribe = source.subscribe(() => {});

    // then
    unsubscribe!();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    first.mockClear();
    second.mockClear();

    // then
    removeFirst();
    unsubscribe = source.subscribe(() => {});
    unsubscribe!();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    first.mockClear();
    second.mockClear();
    // then
    removeSecond();
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });
});
