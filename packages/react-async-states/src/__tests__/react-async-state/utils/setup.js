export function mockDateNow() {
  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => TESTS_TS);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });
}
export const TESTS_TS = 1487076708000;
export let dateNowSpy;
