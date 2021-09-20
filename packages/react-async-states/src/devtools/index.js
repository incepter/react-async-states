import { cloneArgs, shallowClone } from "../shared";

const DEV_TOOLS_EVENTS = Object.freeze({
  asyncState: {
    creation: 0,
    update: 1,
    subscription: 2,
    unsubscription: 3,
    dispose: 4,
    run: 5,
  },
  provider: {
    list: 6,
  }
});

const allowedOrigins = "*";
const source = "async-states-agent";

function emit(eventType, key, payload) {
  window.postMessage({eventType, key, payload: JSON.parse(JSON.stringify(payload)), source}, allowedOrigins);
}

const devtools_old = Object.freeze((function () {
  let currentUpdate = null;
  return {
    emitCreation(asyncState) {
      emit(
        DEV_TOOLS_EVENTS.asyncState.creation,
        asyncState.key,
        {config: asyncState.config, state: asyncState.currentState}
      );
    },
    emitRun(asyncState, argsObject) {
      emit(
        DEV_TOOLS_EVENTS.asyncState.run,
        asyncState.key,
        {argsObject: cloneArgs(argsObject), lastSuccess: asyncState.lastSuccess, state: asyncState.currentState}
      );
    },
    startUpdate(asyncState) {
      currentUpdate = shallowClone(asyncState.currentState);
    },
    emitUpdate(asyncState) {
      emit(
        DEV_TOOLS_EVENTS.asyncState.update,
        asyncState.key,
        {oldState: currentUpdate, state: asyncState.currentState}
      );
      currentUpdate = null;
    },
    emitSubscription(asyncState, context) {
      emit(
        DEV_TOOLS_EVENTS.asyncState.subscription,
        asyncState.key,
        {config: asyncState.config, state: asyncState.currentState}
      );
    },
    emitUnsubscription(asyncState, context) {
      emit(
        DEV_TOOLS_EVENTS.asyncState.unsubscription,
        asyncState.key,
        {config: asyncState.config, state: asyncState.currentState}
      );
    },
    emitDispose(asyncState, context) {
      emit(
        DEV_TOOLS_EVENTS.asyncState.dispose,
        asyncState.key,
        {config: asyncState.config, state: asyncState.currentState}
      );
    },
    emitProvider(entries) {
      emit(
        DEV_TOOLS_EVENTS.provider.list,
        null,
        {entries: formatEntriesToDevtools(entries)}
      );
      currentUpdate = null;
    },
  };
}()));

function getPayloadForEventAndContext(eventType, asyncState, context) {
  if (!asyncState) {
    return undefined;
  }
  switch (eventType) {
    case DEV_TOOLS_EVENTS.asyncState.creation: {
      return {
        eventType: DEV_TOOLS_EVENTS.asyncState.creation,
        lazy: context.lazy,
        state: context.initialValue
      };
    }
    case DEV_TOOLS_EVENTS.asyncState.update: {
      return {
        eventType: DEV_TOOLS_EVENTS.asyncState.update,
        oldState: context.oldState,
        newState: context.newState
      };
    }
    case DEV_TOOLS_EVENTS.asyncState.subscription: {
      return {
        eventType: DEV_TOOLS_EVENTS.asyncState.subscription,
        subscriptionKey: context.key,
        subscriptionType: context.type,
      };
    }
    case DEV_TOOLS_EVENTS.asyncState.unsubscription: {
      return {
        eventType: DEV_TOOLS_EVENTS.asyncState.unsubscription,
        subscriptionKey: context.key
      };
    }
    case DEV_TOOLS_EVENTS.asyncState.dispose: {
      return {
        eventType: DEV_TOOLS_EVENTS.asyncState.dispose,
        state: asyncState.currentState
      };
    }
  }
}

function formatEntriesToDevtools(entries) {
  return Object.entries(entries).reduce((result, [key, entry]) => {
    result[key] = {};
    result[key].state = entry.value.currentState;
    result[key].lastSuccess = entry.value.lastSuccess;
    return result;
  }, {});
}

export default devtools_old;
