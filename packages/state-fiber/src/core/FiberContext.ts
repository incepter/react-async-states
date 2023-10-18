import { ILibraryContext, IStateFiber } from "./_types";

let LibraryContexts = new Map();

export function requestContext(ctx: any): ILibraryContext {
	let existing = LibraryContexts.get(ctx);
	if (existing) {
		return existing;
	}

	let context = new LibraryContext(ctx);
	LibraryContexts.set(ctx, context);
	return context;
}

export function retainContext(ctx: any, context: ILibraryContext) {
	LibraryContexts.set(ctx, context);
}

export function removeContext(ctx: any) {
	return LibraryContexts.delete(ctx);
}

export class LibraryContext implements ILibraryContext {
	private readonly ctx: any;
	private readonly list: Map<string, IStateFiber<any, any, any, any>>;
	constructor(ctx: any) {
		this.ctx = ctx;
		this.get = this.get.bind(this);
		this.set = this.set.bind(this);
		this.remove = this.remove.bind(this);
		this.list = new Map<string, IStateFiber<any, any, any, any>>();
	}
	get(key: string): IStateFiber<any, any, any, any> | undefined {
		return this.list.get(key);
	}
	set(key: string, instance: IStateFiber<any, any, any, any>): void {
		this.list.set(key, instance);
	}
	remove(key: string) {
		return this.list.delete(key);
	}
}
