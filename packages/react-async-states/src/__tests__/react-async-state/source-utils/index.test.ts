import {createSource} from "async-states-core";

describe('source utils', () => {

  const source = createSource("test-source", null, {initialValue: 0});

  it('should run a source', () => {
    const abort = source.run(1);
    expect(source.getState().data).toBe(1);
    expect(typeof abort).toBe("function");
  });
  it('should runp a source', async () => {
    const state = await source.runp(2);
    expect(source.getState().data).toBe(2);
    expect(typeof state).toBe("object"); // promise
    expect(state).toBe(source.getState());
  });
  it('should run a source lane', () => {
    const abort = source.getLaneSource("test-lane").run(3);
    expect(source.getLaneSource("test-lane").getState().data).toBe(3);
    expect(typeof abort).toBe("function");
  });
  it('should runp a source lane', async () => {
    const state = await source.getLaneSource("test-lane").runp(4);
    expect(source.getLaneSource("test-lane").getState().data).toBe(4);
    expect(typeof state).toBe("object"); // promise
    expect(state).toBe(source.getLaneSource("test-lane").getState());
  });
  it('should replace the state with a value', () => {
    source.setState(5);
    expect(source.getState().data).toBe(5);
  });
  it('should replace the state with an updater', () => {
    const oldState = source.getState();
    source.setState(old => old.data + 1);
    expect(source.getState().data).toBe(oldState.data + 1);
  });
});
