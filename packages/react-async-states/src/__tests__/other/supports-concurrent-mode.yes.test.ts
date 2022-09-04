import {supportsConcurrentMode} from "../../react/helpers/supports-concurrent-mode";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useSyncExternalStore: () => {
  },
}));
describe('supportsConcurrentMode', () => {
  it('should say yes', () => {
    expect(supportsConcurrentMode()).toEqual(true);
    jest.unmock("react");
  });
});
