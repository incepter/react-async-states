import {createReadInConcurrentMode} from "../../state-hook/StateHook";
import {AsyncState} from "async-states";
import {flushPromises} from "../react-async-state/utils/test-utils";

describe('readInConcurrentMode function creation', () => {
  let instance = new AsyncState("toto", () => Promise.resolve(12))
  it('should suspend when true is given', async () => {
    let read = createReadInConcurrentMode(instance, 15, 2000, {autoRunArgs: [10]})

    expect(instance.state.status).toBe("initial")
    expect(read()).toEqual(15) // wont throw, because status is initial now
    try {
      read("both") // throws in both initial and pending
    } catch (e: any) {
      expect(e.constructor).toBe(Promise)
    }

    expect(instance.state.status).toBe("pending")
    try {
      read("pending") // throws only in pending
    } catch (e: any) {
      expect(e.constructor).toBe(Promise)
    }

    await flushPromises()
    expect(instance.state.status).toBe("success")
    expect(read()).toBe(15)
  });
});
