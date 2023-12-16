import { AsyncState } from "../../AsyncState";
import {jest} from "@jest/globals";

// @ts-ignore
jest.useFakeTimers("modern");
describe("AsyncState -- setData", () => {
	it("should change state to success with setData", () => {
		let inst = new AsyncState("test-1", null);

		let prevValue: any;
		inst.actions.setData((prev) => {
			prevValue = prev;
			return 5;
		});

		expect(prevValue).toBe(null);
		expect(inst.state.data).toBe(5);
		expect(inst.state.status).toBe("success");

		inst.actions.setData(15);
		expect(inst.state.data).toBe(15);
		expect(inst.state.status).toBe("success");

		inst.actions.setData((prev) => {
			prevValue = prev;
			return 20;
		});
		expect(prevValue).toBe(15);
		expect(inst.state.data).toBe(20);
		expect(inst.state.status).toBe("success");
	});
	it("should correctly queue setData too", async () => {
		let inst = new AsyncState("test-1", null, {
      keepPendingForMs: 200
    });

    inst.actions.setState(null, "pending");
    inst.actions.setState(5, "success");
    inst.actions.setData(10);
    let prevValue: any;
    inst.actions.setData(prev => {
      prevValue = prev;
      return 15;
    });

    // keep pending should keep it pending
		expect(inst.state.status).toBe("pending");
    jest.advanceTimersByTime(200);
    expect(inst.state.status).toBe("success");
    expect(prevValue).toBe(10);
	});
});
