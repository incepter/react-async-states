export const newDevtoolsRequests = {
  getKeys: "get-keys",
  getAsyncState: "get-async-state",
}

export const newDevtoolsEvents = {
  setKeys: "set-keys",
  setAsyncState: "set-async-state",
}

export const toDevtoolsEvents = {
  provider: "sync-provider", // provider state sent to devtools_old; should be fired once a hoist/fork/entries_change

  asyncState: "async-state-information", // gives information about an async state

  journal: "journal-event",

  flush: "flush"
};

export const devtoolsJournalEvents = {
  run: "run",
  update: "update",
  dispose: "dispose",
  creation: "creation",
  subscription: "subscription",
  unsubscription: "unsubscription",
  insideProvider: "inside-provider",
}
