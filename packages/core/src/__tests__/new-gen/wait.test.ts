describe('source.wait()', () => {
  // The wait API should be used in async contexts to wait for a pending
  // instance before doing some work.
  // Sometimes, you need to grab a state from an instance in an event handler
  // but you need to test on whether the status is pending and if it is the case
  // you will need to subscribe to the instance and then continue the work after
  // it resolves.

  // This feature addresses this use case where it would give you a promise to
  // be used like this:
  // async function myFunction() {
  //   let state = source.wait();
  //       | state here is either initial, success or error
  // }

  // Challenges:
  // in case of the returned promise related to an ongoing run gets aborted
  // we should notify resolve the promise either ways when state changes
  it.skip('should wait for a pending source', () => {

  });
  it.skip('should resolve instantly when not pending', () => {

  });
});
