import {createSource} from "../../../async-state/create-async-state";
import {
  getLaneSource,
  getState,
  replaceState,
  runpSource,
  runpSourceLane,
  runSource,
  runSourceLane
} from "../../../async-state/source-utils";

describe('source utils', () => {

  const source = createSource("test-source", null, {initialValue: 0});

  it('should run a source', () => {
    const abort = runSource(source, 1);
    expect(getState(source).data).toBe(1);
    expect(typeof abort).toBe("function");
  });
  it('should runp a source', async () => {
    const state = await runpSource(source, 2);
    expect(getState(source).data).toBe(2);
    expect(typeof state).toBe("object"); // promise
    expect(state).toBe(getState(source));
  });
  it('should run a source lane', () => {
    const abort = runSourceLane(source, "test-lane", 3);
    expect(getState(getLaneSource(source, "test-lane")).data).toBe(3);
    expect(typeof abort).toBe("function");
  });
  it('should runp a source lane', async () => {
    const state = await runpSourceLane(source, "test-lane", 4);
    expect(getState(getLaneSource(source, "test-lane")).data).toBe(4);
    expect(typeof state).toBe("object"); // promise
    expect(state).toBe(getState(getLaneSource(source, "test-lane")));
  });
  it('should replace the state with a value', () => {
    replaceState(source, 5);
    expect(getState(source).data).toBe(5);
  });
  it('should replace the state with an updater', () => {
    const oldState = getState(source);
    replaceState(source, old => old.data + 1);
    expect(getState(source).data).toBe(oldState.data + 1);
  });
});
