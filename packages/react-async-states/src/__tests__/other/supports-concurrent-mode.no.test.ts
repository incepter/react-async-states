import {supportsConcurrentMode} from "../../helpers/supports-concurrent-mode";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useSyncExternalStore: undefined,
}));
describe('supportsConcurrentMode', () => {
  it('should say no', () => {
    expect(supportsConcurrentMode()).toEqual(false);
  });
});
