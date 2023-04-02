import {createSource, readSource} from "../../AsyncState";

describe('readSource', () => {
  it('should correctly read the source', () => {
    let source = createSource("test", null, {initialValue: 0});
    let asyncState = readSource(source);
    expect(asyncState.state.data).toEqual(0);
  });
  it('should throw on invalid source', () => {
    let source = {key: "test", uniqueId: 0};
    // @ts-ignore
    expect(() => readSource(source))
      .toThrow("Incompatible Source object.");
  });
});
