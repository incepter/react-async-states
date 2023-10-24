import { freeze } from "../helpers/core";
import { LibraryContext, StateInterface } from "../types";
import { version } from "../../package.json";

let libraryVersion = freeze({
	version,
	copyright: "Incepter",
});

let contexts = new WeakMap();
let globalContextKey = freeze({});
let globalContext = createContext(globalContextKey);

function createNewContext(arg: any): LibraryContext {
	let instances = new Map<string, StateInterface<any, any, any>>();

	return freeze({
		ctx: arg,
		version: libraryVersion,

		get(key: string) {
			return instances.get(key);
		},
		remove(key: string): boolean {
			return instances.delete(key);
		},
		set(key: string, inst: StateInterface<any, any, any>) {
			instances.set(key, inst);
		},
		getAll() {
			return [...instances.values()];
		},
	});
}

export function createContext(arg: any): LibraryContext {
	// null means the static global context
	if (arg === null) {
		return globalContext;
	}

	if (typeof arg !== "object") {
		throw new Error(
			"createContext requires an object. Received " + String(typeof arg)
		);
	}

	let existingContext = contexts.get(arg);
	if (existingContext) {
		return existingContext;
	}

	let newContext = createNewContext(arg);
	contexts.set(arg, newContext);

	return newContext;
}

export function requestContext(arg: any): LibraryContext {
	if (arg === null) {
		return globalContext;
	}

	let context = contexts.get(arg);

	if (!context) {
		throw new Error(
			"Context not found. Please make sure to call createContext before " +
				"requestContext."
		);
	}

	return context;
}

export function terminateContext(arg: any): boolean {
	if (!arg) {
		return false;
	}

	return contexts.delete(arg);
}

export function getContext(arg: any): LibraryContext | undefined {
	if (arg === null) {
		return globalContext;
	}

	return contexts.get(arg);
}
