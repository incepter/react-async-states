this.port = chrome.runtime.connect({
  name: "panel"
});

this.port.postMessage(!console.log('POSTING') && {
  name: "init",
  tabId: chrome.devtools.inspectedWindow.tabId
});

let messages = [];

this.port.onMessage.addListener(message => {
  if (message.source === "async-states-agent") {
    // Do what you want with the message object
    // E.g. this.setState(newState);
    addMessageToUi(message);
  }
});

function createLi(innerText) {
  const li = document.createElement("li");
  li.style.borderTop = "1px solid white";
  li.style.color = "white";
  li.innerText = innerText;
  return li;
}

const EVENT_TYPES = {
  0: {
    name: "Creation",
    getNode(eventType, key, payload) {
      return createLi(`[${key}]  -  ${EVENT_TYPES[eventType].name}`);
    }
  },
  1: {
    name: "Update",
    getNode(eventType, key, payload) {
      return createLi(`[${key}]  -  ${EVENT_TYPES[eventType].name}: from status ${payload.oldState.status} to ${payload.state.status}`);
    }
  },
  2: {
    name: "Subscription",
    getNode(eventType, key, payload) {
      return createLi(`[${key}]  -  ${EVENT_TYPES[eventType].name}: Not implemented yet`);
    }
  },
  3: {
    name: "Unsubscription",
    getNode(eventType, key, payload) {
      return createLi(`[${key}]  -  ${EVENT_TYPES[eventType].name}: Not implemented yet`);
    }
  },
  4: {
    name: "Dispose",
    getNode(eventType, key, payload) {
      return createLi(`[${key}]  -  ${EVENT_TYPES[eventType].name}: Not implemented yet`);
    }
  },
  5: {
    name: "Run",
    getNode(eventType, key, payload) {
      const {state} = payload;
      return createLi(`[${key}]  -  ${EVENT_TYPES[eventType].name}: status: ${state.status}`);
    }
  },
};

function addMessageToUi(message) {
  const key = message?.key;
  const payload = message?.payload;
  const eventType = message?.eventType;
  if (!payload || !key || !EVENT_TYPES[eventType]) {
    return;
  }

  const list = document.getElementById("messages-list");
  const node = EVENT_TYPES[eventType]?.getNode(eventType, key, payload);
  if (node) {
    list.appendChild(node);
  }
}

chrome.devtools.panels.create("Async states", null, "/html/panel.html", null);
