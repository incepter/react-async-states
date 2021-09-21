export const devtoolsRequests = {
  provider: "get-provider-state", // Map<key, info>

  info: "get-async-state-info", // shape: {state, subscribers, lastSuccess}
};

export const toDevtoolsEvents = {
  provider: "sync-provider", // provider state sent to devtools_old; should be fired once a hoist/fork/entries_change

  asyncState: "async-state-information", // gives information about an async state

  journal: "journal-event"
};

export const devtoolsJournalEvents = {
  run: "run",
  update: "update",
  dispose: "dispose",
  creation: "creation",
  promiseType: "promiseType",
  subscription: "subscription",
  unsubscription: "unsubscription"
}
