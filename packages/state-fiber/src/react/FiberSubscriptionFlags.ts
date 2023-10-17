// these flags will be used to give capabilities to hooks

import { __DEV__ } from "../utils";

export const LEGACY /*             */ = 0b0000_0000_0001; // Old react style
export const CONCURRENT /*         */ = 0b0000_0000_0010; // Suspense
export const THROW_ON_ERROR /*     */ = 0b0000_0000_0100; // error boundary
export const TRANSITION /*         */ = 0b0000_0000_1000; // transitions

export const SUSPENDING /*         */ = 0b0000_0001_0000; // threw on render
export const COMMITTED /*          */ = 0b0000_0010_0000; // painted on screen


export const USE_FIBER = LEGACY;
export const USE_ASYNC = CONCURRENT | THROW_ON_ERROR | TRANSITION;

export let humanizeFlags;
/* istanbul ignore next */
if (__DEV__) {
	humanizeFlags = (flags: number) => {
		let output: string[] = [];
		if (flags & LEGACY) {
			output.push("LEGACY");
		}
		if (flags & CONCURRENT) {
			output.push("CONCURRENT");
		}
		if (flags & THROW_ON_ERROR) {
			output.push("THROW_ON_ERROR");
		}
		if (flags & TRANSITION) {
			output.push("TRANSITION");
		}
		if (flags & SUSPENDING) {
			output.push("SUSPENDING");
		}
		if (flags & COMMITTED) {
			output.push("COMMITTED");
		}
		return output;
	};
}