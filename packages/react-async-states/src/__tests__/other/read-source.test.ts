import {
  readInstanceFromSource
} from "../../async-state/AsyncState";
import {createSource} from "../../async-state";

describe('readSource', () => {
  it('should correctly read the source', () => {
    // given
    const source = createSource("test", null, {initialValue: 0});

    // when
    const asyncState = readInstanceFromSource(source);

    // then
    expect(asyncState.state.data).toEqual(0);
  });
  it('should throw on invalid source', () => {
    // given
    const source = {key: "test", uniqueId: 0};

    // then
    // @ts-ignore
    expect(() => readInstanceFromSource(source))
      .toThrow("You ve passed an incompatible source object. Please make sure to pass the received source object.");
  });
});
