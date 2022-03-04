import {createReducerProducer} from "../../helpers/create-producer";
import {AsyncStateStatus} from "../../async-state";
import {supportsConcurrentMode} from "../../helpers/supports-concurrent-mode";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useSyncExternalStore : () => {},
}));
describe('supportsConcurrentMode', () => {
  it('should say yes', () => {
    expect(supportsConcurrentMode()).toEqual(true);
    jest.unmock("react");
  });
});
