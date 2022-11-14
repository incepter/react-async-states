export enum DevtoolsRequest {
  init = "init",
  getKeys = "get-keys",
  disconnect = "disconnect",
  getAsyncState = "get-async-state",
  changeAsyncState = "change-async-state",
}

export enum DevtoolsEvent {
  setKeys = "set-keys",
  setAsyncState = "set-async-state",
  partialSync = "async-state-partial-sync",
}

export enum DevtoolsJournalEvent {
  run = "run",
  update = "update",
  dispose = "dispose",
  creation = "creation",
  subscription = "subscription",
  unsubscription = "unsubscription",
  insideProvider = "inside-provider",
}
