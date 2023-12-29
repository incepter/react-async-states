import { AsyncState } from "../../AsyncState";

describe("AsyncState.reply", () => {
  it("should reply async state latest run", () => {
    // given
    const producer = jest.fn().mockImplementation((props) => props.args?.[0]);
    const asyncState = new AsyncState("key", producer);
    asyncState.payload = { hello: true };
    // when
    asyncState.actions.replay();
    expect(producer).not.toHaveBeenCalled();

    asyncState.actions.run(1);
    // then
    expect(producer.mock.calls[0][0].args).toEqual([1]);
    expect(producer.mock.calls[0][0].payload).toEqual({ hello: true });

    asyncState.payload = { hello: false };
    expect(asyncState.payload.hello).toBe(false);
    asyncState.actions.replay();
    expect(producer.mock.calls[1][0].args).toEqual([1]);
    expect(producer.mock.calls[1][0].payload).toEqual({ hello: true });
  });
});
