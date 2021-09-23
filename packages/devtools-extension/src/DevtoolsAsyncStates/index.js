import { devtoolsJournalEvents, toDevtoolsEvents } from "devtools/eventTypes";
import { shallowClone } from "shared";

export function DevtoolsAsyncStates(initialMap) {
  let map = shallowClone(initialMap);

  const returnValue = {value: map, applyMessage};
  return returnValue;

  function applyMessage(message) {
    if (message.source !== "async-states-agent") {
      return false;
    }
    switch (message.type) {
      case toDevtoolsEvents.journal:
        return readJournalMessage(message);
      case toDevtoolsEvents.provider:
        return syncProvider(message);
      case toDevtoolsEvents.asyncState:
        return syncAsyncState(message);
      default:
        return false;
    }
  }

  function syncProvider(message) {
    if (!message.payload || !Object.keys(message.payload).length) {
      return false;
    }

    map = shallowClone(map);
    returnValue.value = map;
    Object.values(message.payload).forEach(function syncProviderAsyncState(eventValue) {
      const {uniqueId, state, lastSuccess} = eventValue;
      if (!map[uniqueId]) {
        createDevtoolAsyncState(uniqueId, eventValue.key);
      } else {
        map[uniqueId] = shallowClone(map[uniqueId]);
      }
      map[uniqueId].state = state;
      map[uniqueId].lastSuccess = lastSuccess;
      map[uniqueId].isInsideProvider = true;
    });

    return true;
  }

  function syncAsyncState(message) {
    const {key, uniqueId, state, lastSuccess, subscriptions} = message.payload;
    if (!map[uniqueId]) {
      createDevtoolAsyncState(uniqueId, key);
    } else {
      map[uniqueId] = shallowClone(map[uniqueId]);
    }
    map[uniqueId].state = state;
    map[uniqueId].lastSuccess = lastSuccess;
    map[uniqueId].subscriptions = subscriptions;
    return true;
  }

  function readJournalMessage(message) {
    const {key, uniqueId, eventType, eventPayload} = message.payload;
    if (!map[uniqueId]) {
      createDevtoolAsyncState(uniqueId, key);
    } else {
      map[uniqueId] = shallowClone(map[uniqueId]);
    }
    switch (eventType) {
      case devtoolsJournalEvents.run: {
        map[uniqueId].promiseType = eventPayload.type;
        map[uniqueId].journal.push(message.payload);
        return true;
      }
      case devtoolsJournalEvents.insideProvider: {
        map[uniqueId].isInsideProvider = eventPayload;
        return true;
      }
      case devtoolsJournalEvents.creation: {
        map[uniqueId].state = eventPayload;
        map[uniqueId].lastSuccess = eventPayload;
        map[uniqueId].journal.push(message.payload);
        return true;
      }
      case devtoolsJournalEvents.dispose: {
        map[uniqueId].state = eventPayload.state;
        map[uniqueId].lastSuccess = eventPayload.lastSuccess;
        map[uniqueId].journal.push(message.payload);
        return true;
      }

      case devtoolsJournalEvents.update: {
        map[uniqueId].state = eventPayload.newState;
        map[uniqueId].lastSuccess = eventPayload.lastSuccess;
        map[uniqueId].journal.push(message.payload);
        return true;
      }

      case devtoolsJournalEvents.subscription: {
        map[uniqueId].journal.push(message.payload);
        map[uniqueId].subscriptions.push(eventPayload);
        return true;
      }
      case devtoolsJournalEvents.unsubscription: {
        map[uniqueId].journal.push(message.payload);
        map[uniqueId].subscriptions = map[uniqueId].subscriptions.filter(t => t !== eventPayload);
        return true;
      }

      default:
        return false;
    }
  }

  function createDevtoolAsyncState(uniqueId, key) {
    map[uniqueId] = {
      key,
      uniqueId,
      state: {},
      journal: [],
      lastSuccess: {},
      subscriptions: [],
      promiseType: undefined,
      isInsideProvider: false,
    };
    Object.preventExtensions(map[uniqueId]);
  }
}
