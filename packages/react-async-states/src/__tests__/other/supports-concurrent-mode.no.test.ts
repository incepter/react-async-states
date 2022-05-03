import {supportsConcurrentMode} from "../../helpers/supports-concurrent-mode";

describe('supportsConcurrentMode', () => {
  it('should say no', () => {
    expect(supportsConcurrentMode()).toEqual(false);
  });
});
