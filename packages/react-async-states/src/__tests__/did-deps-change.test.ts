import {didDepsChange} from "../shared";

describe('didDepsChange', () => {
  it('should return true', () => {
    expect(didDepsChange([], [1])).toBe(true)
    expect(didDepsChange([1], [2])).toBe(true)
    expect(didDepsChange([1, 2], [1, 3])).toBe(true)
    expect(didDepsChange([1, {}], [1, {}])).toBe(true)
    expect(didDepsChange([1, "incepter"], [1, "incepterr"])).toBe(true)
  });
  it('should return false', () => {
    expect(didDepsChange([], [])).toBe(false)
    expect(didDepsChange([1], [1])).toBe(false)
    expect(didDepsChange(["1"], ["1"])).toBe(false)
    expect(didDepsChange([1, 2, 3, 4], [1, 2, 3, 4])).toBe(false)
    let obj = {}
    expect(didDepsChange([1, 2, 3, obj], [1, 2, 3, obj])).toBe(false)
  });
});
