import { screen } from "@testing-library/react";

export function flushPromises() {
	return new Promise(jest.requireActual("timers").setImmediate);
}

export function doesNodeExist(testId) {
	try {
		screen.getByTestId(testId);
		return true;
	} catch (e: any) {
		return false;
	}
}
