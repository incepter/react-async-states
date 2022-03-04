import {createReducerProducer} from "../../helpers/create-producer";
import {AsyncStateStatus} from "../../async-state";
import {supportsConcurrentMode} from "../../helpers/supports-concurrent-mode";

describe('supportsConcurrentMode', () => {
  it('should say no', () => {
    expect(supportsConcurrentMode()).toEqual(false);
  });
});
