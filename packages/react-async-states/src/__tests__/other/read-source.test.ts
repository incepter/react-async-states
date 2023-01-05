import {createSource, readSource} from "async-states";

describe('readSource', () => {
  it('should correctly read the source', () => {
    // given
    const source = createSource("test", null, {initialValue: 0});

    // when
    const asyncState = readSource(source);

    // then
    expect(asyncState.state.data).toEqual(0);
  });
  it('should throw on invalid source', () => {
    // given
    const source = {key: "test", uniqueId: 0};

    // then
    // @ts-ignore
    expect(() => readSource(source))
      .toThrow("Incompatible Source object.");
  });
});
