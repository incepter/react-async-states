import {createReducerProducer} from "../../helpers/create-producer";
import {AsyncStateStatus} from "../../async-state";

describe('createReducerProducer', () => {
  it('should throw when not a function', () => {
    // @ts-ignore
    expect(() => createReducerProducer(null)).toThrow();
    // @ts-ignore
    expect(() => createReducerProducer(undefined)).toThrow();
    // @ts-ignore
    expect(() => createReducerProducer({})).toThrow();
    // @ts-ignore
    expect(() => createReducerProducer("string")).toThrow();
  });
  it('should create a producer from a reducer fn', () => {
    function reducer(state, a) {
      return (state + a) || 0;
    }

    const producer = createReducerProducer(reducer);

    expect(
      // @ts-ignore
      producer({
        lastSuccess: {data: 0, status: AsyncStateStatus.success},
        args: [1]
      })
    ).toEqual(1);
  });
});
