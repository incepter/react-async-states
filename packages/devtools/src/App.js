import React from "react";
import ReactJson from "react-json-view";

const isDev = process.env.NODE_ENV !== "production";

let dictionary = !isDev ? {} : JSON.parse('{"timeout2":{"state":{"status":"initial","data":null,"args":null},"lastSuccess":{"status":"initial","data":null,"args":null},"subscriptions":[]}, "timeout":{"state":{"status":"initial","data":null,"args":null},"lastSuccess":{"status":"initial","data":null,"args":null},"subscriptions":[]}, "timeout3":{"state":{"status":"initial","data":null,"args":null},"lastSuccess":{"status":"initial","data":null,"args":null},"subscriptions":[]},"users":{"state":{"status":"success","data":[{"id":1,"name":"Leanne Graham","username":"Bret","email":"Sincere@april.biz","address":{"street":"Kulas Light","suite":"Apt. 556","city":"Gwenborough","zipcode":"92998-3874","geo":{"lat":"-37.3159","lng":"81.1496"}},"phone":"1-770-736-8031 x56442","website":"hildegard.org","company":{"name":"Romaguera-Crona","catchPhrase":"Multi-layered client-server neural-net","bs":"harness real-time e-markets"}},{"id":2,"name":"Ervin Howell","username":"Antonette","email":"Shanna@melissa.tv","address":{"street":"Victor Plains","suite":"Suite 879","city":"Wisokyburgh","zipcode":"90566-7771","geo":{"lat":"-43.9509","lng":"-34.4618"}},"phone":"010-692-6593 x09125","website":"anastasia.net","company":{"name":"Deckow-Crist","catchPhrase":"Proactive didactic contingency","bs":"synergize scalable supply-chains"}},{"id":3,"name":"Clementine Bauch","username":"Samantha","email":"Nathan@yesenia.net","address":{"street":"Douglas Extension","suite":"Suite 847","city":"McKenziehaven","zipcode":"59590-4157","geo":{"lat":"-68.6102","lng":"-47.0653"}},"phone":"1-463-123-4447","website":"ramiro.info","company":{"name":"Romaguera-Jacobson","catchPhrase":"Face to face bifurcated interface","bs":"e-enable strategic applications"}},{"id":4,"name":"Patricia Lebsack","username":"Karianne","email":"Julianne.OConner@kory.org","address":{"street":"Hoeger Mall","suite":"Apt. 692","city":"South Elvis","zipcode":"53919-4257","geo":{"lat":"29.4572","lng":"-164.2990"}},"phone":"493-170-9623 x156","website":"kale.biz","company":{"name":"Robel-Corkery","catchPhrase":"Multi-tiered zero tolerance productivity","bs":"transition cutting-edge web services"}},{"id":5,"name":"Chelsey Dietrich","username":"Kamren","email":"Lucio_Hettinger@annie.ca","address":{"street":"Skiles Walks","suite":"Suite 351","city":"Roscoeview","zipcode":"33263","geo":{"lat":"-31.8129","lng":"62.5342"}},"phone":"(254)954-1289","website":"demarco.info","company":{"name":"Keebler LLC","catchPhrase":"User-centric fault-tolerant solution","bs":"revolutionize end-to-end systems"}},{"id":6,"name":"Mrs. Dennis Schulist","username":"Leopoldo_Corkery","email":"Karley_Dach@jasper.info","address":{"street":"Norberto Crossing","suite":"Apt. 950","city":"South Christy","zipcode":"23505-1337","geo":{"lat":"-71.4197","lng":"71.7478"}},"phone":"1-477-935-8478 x6430","website":"ola.org","company":{"name":"Considine-Lockman","catchPhrase":"Synchronised bottom-line interface","bs":"e-enable innovative applications"}},{"id":7,"name":"Kurtis Weissnat","username":"Elwyn.Skiles","email":"Telly.Hoeger@billy.biz","address":{"street":"Rex Trail","suite":"Suite 280","city":"Howemouth","zipcode":"58804-1099","geo":{"lat":"24.8918","lng":"21.8984"}},"phone":"210.067.6132","website":"elvis.io","company":{"name":"Johns Group","catchPhrase":"Configurable multimedia task-force","bs":"generate enterprise e-tailers"}},{"id":8,"name":"Nicholas Runolfsdottir V","username":"Maxime_Nienow","email":"Sherwood@rosamond.me","address":{"street":"Ellsworth Summit","suite":"Suite 729","city":"Aliyaview","zipcode":"45169","geo":{"lat":"-14.3990","lng":"-120.7677"}},"phone":"586.493.6943 x140","website":"jacynthe.com","company":{"name":"Abernathy Group","catchPhrase":"Implemented secondary concept","bs":"e-enable extensible e-tailers"}},{"id":9,"name":"Glenna Reichert","username":"Delphine","email":"Chaim_McDermott@dana.io","address":{"street":"Dayna Park","suite":"Suite 449","city":"Bartholomebury","zipcode":"76495-3109","geo":{"lat":"24.6463","lng":"-168.8889"}},"phone":"(775)976-6794 x41206","website":"conrad.com","company":{"name":"Yost and Sons","catchPhrase":"Switchable contextually-based project","bs":"aggregate real-time technologies"}},{"id":10,"name":"Clementina DuBuque","username":"Moriah.Stanton","email":"Rey.Padberg@karina.biz","address":{"street":"Kattie Turnpike","suite":"Suite 198","city":"Lebsackbury","zipcode":"31428-2261","geo":{"lat":"-38.2386","lng":"57.2232"}},"phone":"024-648-3804","website":"ambrose.net","company":{"name":"Hoeger LLC","catchPhrase":"Centralized empowering task-force","bs":"target end-to-end models"}}],"args":[{"lastSuccess":{"status":"initial","data":null},"payload":{"location":{"pathname":"/","search":"","hash":""}}}]},"lastSuccess":{"status":"success","data":[{"id":1,"name":"Leanne Graham","username":"Bret","email":"Sincere@april.biz","address":{"street":"Kulas Light","suite":"Apt. 556","city":"Gwenborough","zipcode":"92998-3874","geo":{"lat":"-37.3159","lng":"81.1496"}},"phone":"1-770-736-8031 x56442","website":"hildegard.org","company":{"name":"Romaguera-Crona","catchPhrase":"Multi-layered client-server neural-net","bs":"harness real-time e-markets"}},{"id":2,"name":"Ervin Howell","username":"Antonette","email":"Shanna@melissa.tv","address":{"street":"Victor Plains","suite":"Suite 879","city":"Wisokyburgh","zipcode":"90566-7771","geo":{"lat":"-43.9509","lng":"-34.4618"}},"phone":"010-692-6593 x09125","website":"anastasia.net","company":{"name":"Deckow-Crist","catchPhrase":"Proactive didactic contingency","bs":"synergize scalable supply-chains"}},{"id":3,"name":"Clementine Bauch","username":"Samantha","email":"Nathan@yesenia.net","address":{"street":"Douglas Extension","suite":"Suite 847","city":"McKenziehaven","zipcode":"59590-4157","geo":{"lat":"-68.6102","lng":"-47.0653"}},"phone":"1-463-123-4447","website":"ramiro.info","company":{"name":"Romaguera-Jacobson","catchPhrase":"Face to face bifurcated interface","bs":"e-enable strategic applications"}},{"id":4,"name":"Patricia Lebsack","username":"Karianne","email":"Julianne.OConner@kory.org","address":{"street":"Hoeger Mall","suite":"Apt. 692","city":"South Elvis","zipcode":"53919-4257","geo":{"lat":"29.4572","lng":"-164.2990"}},"phone":"493-170-9623 x156","website":"kale.biz","company":{"name":"Robel-Corkery","catchPhrase":"Multi-tiered zero tolerance productivity","bs":"transition cutting-edge web services"}},{"id":5,"name":"Chelsey Dietrich","username":"Kamren","email":"Lucio_Hettinger@annie.ca","address":{"street":"Skiles Walks","suite":"Suite 351","city":"Roscoeview","zipcode":"33263","geo":{"lat":"-31.8129","lng":"62.5342"}},"phone":"(254)954-1289","website":"demarco.info","company":{"name":"Keebler LLC","catchPhrase":"User-centric fault-tolerant solution","bs":"revolutionize end-to-end systems"}},{"id":6,"name":"Mrs. Dennis Schulist","username":"Leopoldo_Corkery","email":"Karley_Dach@jasper.info","address":{"street":"Norberto Crossing","suite":"Apt. 950","city":"South Christy","zipcode":"23505-1337","geo":{"lat":"-71.4197","lng":"71.7478"}},"phone":"1-477-935-8478 x6430","website":"ola.org","company":{"name":"Considine-Lockman","catchPhrase":"Synchronised bottom-line interface","bs":"e-enable innovative applications"}},{"id":7,"name":"Kurtis Weissnat","username":"Elwyn.Skiles","email":"Telly.Hoeger@billy.biz","address":{"street":"Rex Trail","suite":"Suite 280","city":"Howemouth","zipcode":"58804-1099","geo":{"lat":"24.8918","lng":"21.8984"}},"phone":"210.067.6132","website":"elvis.io","company":{"name":"Johns Group","catchPhrase":"Configurable multimedia task-force","bs":"generate enterprise e-tailers"}},{"id":8,"name":"Nicholas Runolfsdottir V","username":"Maxime_Nienow","email":"Sherwood@rosamond.me","address":{"street":"Ellsworth Summit","suite":"Suite 729","city":"Aliyaview","zipcode":"45169","geo":{"lat":"-14.3990","lng":"-120.7677"}},"phone":"586.493.6943 x140","website":"jacynthe.com","company":{"name":"Abernathy Group","catchPhrase":"Implemented secondary concept","bs":"e-enable extensible e-tailers"}},{"id":9,"name":"Glenna Reichert","username":"Delphine","email":"Chaim_McDermott@dana.io","address":{"street":"Dayna Park","suite":"Suite 449","city":"Bartholomebury","zipcode":"76495-3109","geo":{"lat":"24.6463","lng":"-168.8889"}},"phone":"(775)976-6794 x41206","website":"conrad.com","company":{"name":"Yost and Sons","catchPhrase":"Switchable contextually-based project","bs":"aggregate real-time technologies"}},{"id":10,"name":"Clementina DuBuque","username":"Moriah.Stanton","email":"Rey.Padberg@karina.biz","address":{"street":"Kattie Turnpike","suite":"Suite 198","city":"Lebsackbury","zipcode":"31428-2261","geo":{"lat":"-38.2386","lng":"57.2232"}},"phone":"024-648-3804","website":"ambrose.net","company":{"name":"Hoeger LLC","catchPhrase":"Centralized empowering task-force","bs":"target end-to-end models"}}],"args":[{"lastSuccess":{"status":"initial","data":null},"payload":{"location":{"pathname":"/","search":"","hash":""}}}]},"subscriptions":["users-sub-1"]},"posts":{"state":{"status":"initial","data":null,"args":null},"lastSuccess":{"status":"initial","data":null,"args":null},"subscriptions":["posts-sub-1"]},"get-user":{"state":{"status":"initial","data":null,"args":null},"lastSuccess":{"status":"initial","data":null,"args":null},"subscriptions":[]},"counter":{"state":{"status":"initial","data":0,"args":null},"lastSuccess":{"status":"initial","data":0,"args":null},"subscriptions":["counter-sub-1","counter-sub-2"]},"user_input":{"state":{"status":"initial","data":"Type something","args":null},"lastSuccess":{"status":"initial","data":"Type something","args":null},"subscriptions":["user_input-sub-1","user_input-sub-2","user_input-sub-3","user_input-sub-4"]}}');

let journal = !isDev ? {} : {
  1: [
    {key: 1, eventType: "creation", eventDate: Date.now(), eventPayload: {initialValue: "daa", config: {}}},
    {key: 1, eventType: "update", eventDate: Date.now(), eventPayload: {oldState: {status: "initial"}, newState: {}}},
  ],
};

if (isDev) {
  window.chrome = {
    devtools: {
      inspectedWindow: {
        tabId: -1,
      },
    },
    runtime: {
      connect() {
        return {
          postMessage(msg) {
            console.log('posting messages', msg);
          },
          onMessage: {
            addListener(fn) {
              console.log('listener', fn);
            }
          }
        };
      },
    }
  };
}

function applyMessageFromAgent(message) {
  if (!message) {
    return false;
  }
  switch (message.type) {
    case "sync-provider": {
      dictionary = {...dictionary, ...message.payload};
      return true;
    }
    case "async-state-information": {
      const {payload} = message;
      dictionary[payload.uniqueId] = payload;
      return true;
    }
    case "journal-event": {
      const {key, uniqueId, eventType, eventDate, eventPayload} = message.payload;
      if (!journal[uniqueId]) {
        journal[uniqueId] = [];
      }
      if (!dictionary[uniqueId]) {
        dictionary[uniqueId] = {
          key,
          uniqueId,
          state: {},
          lastSuccess: {},
          subscriptions: [],
          promiseType: undefined,
        };
      }
      const journalArray = journal[uniqueId];
      switch (eventType) {

        case "update":
        case "dispose": {
          dictionary[uniqueId].state = eventPayload.newState;
          dictionary[uniqueId].lastSuccess = eventPayload.lastSuccess;
          journalArray.push({key, uniqueId, eventType, eventDate, eventPayload});
          return true;
        }
        case "promiseType": {
          dictionary[uniqueId].promiseType = eventPayload;
          return true;
        }
        case "run":
        case "creation": {
          journalArray.push({key, uniqueId, eventType, eventDate, eventPayload});
          return true;
        }
        case "subscription": {
          dictionary[uniqueId].subscriptions.push(eventPayload);
          journalArray.push({key, uniqueId, eventType, eventDate, eventPayload});
          return true;
        }
        case "unsubscription": {
          dictionary[uniqueId].subscriptions = dictionary[uniqueId]?.subscriptions?.filter(t => t !== eventPayload);
          journalArray.push({key, uniqueId, eventType, eventDate, eventPayload});
          return true;
        }
        default: {
          return false;
        }
      }
    }
    default: {
      return false;
    }
  }
}

function App() {
  const rerender = React.useState()[1];
  const port = React.useRef();
  React.useEffect(() => {
    port.current = window.chrome.runtime.connect({
      name: "panel"
    });

    port.current.postMessage({
      type: "init",
      source: "async-states-devtools-panel",
      tabId: window.chrome.devtools.inspectedWindow.tabId
    });

    port.current.onMessage.addListener(message => {
      if (message.source !== "async-states-agent") {
        return;
      }
      console.log("*__message__from__agent*", message.type, message.payload, journal);
      const didApply = applyMessageFromAgent(message);
      if (didApply) {
        rerender({});
      }
    });

    port.current.postMessage({
      type: "get-provider-state",
      source: "async-states-devtools-panel"
    });
  }, []);

  const entries = Object.entries(dictionary);

  return (
    <div>
      <header>
        {!entries.length && <p>
          Nothing to show
        </p>}
        <Layout port={port}/>
      </header>
    </div>
  );

}

const views = {
  overview: 0,
  journal: 1,
};

function Layout() {
  const [currentView, setCurrentView] = React.useState(views.overview);

  function onElementClick(nextValue) {
    return function caller() {
      setCurrentView(nextValue);
    }
  }

  return (
    <div className="main-container">
      <div className="sidebar-wrapper">
        <Sidebar onElementClick={onElementClick}/>
      </div>
      <div className="view-wrapper">
        {currentView === views.overview && <Overview/>}
        {currentView === views.journal && <Journal/>}
      </div>
    </div>
  );
}

function Sidebar({onElementClick}) {
  return (
    <div>
      <ul>
        <li onClick={onElementClick(views.overview)} className="sidebar-element">Overview</li>
        <li className="sidebar-element">Provider</li>
        <li onClick={onElementClick(views.journal)} className="sidebar-element">Journal</li>
      </ul>
    </div>
  );
}

function Journal() {
  const entries = Object.entries(journal);
  const [currentJson, setCurrentJson] = React.useState(null);
  const [currentJournal, setCurrentJournal] = React.useState(null);
  return (
    entries && (
      <div className="overview-container">
        <div className="overview-journal-list-container">
          {entries.map(([uniqueId, events]) => (
            <button className={`overview-key ${events === currentJournal ? 'active' : ''}`} key={uniqueId}
                    onClick={() => {
                      setCurrentJournal(events);
                      setCurrentJson(events?.length ? events[0] : null);
                    }}>{dictionary[uniqueId]?.key ?? "unknown__bug"}</button>
          ))}
        </div>
        <div className="overview-list-container">
          {currentJournal && currentJournal.map(value => (
            <button className={`overview-key ${value === currentJson ? 'active' : ''}`}
                    key={`${value.eventDate}-${value.uniqueId}-${value.eventType}`}
                    onClick={() => setCurrentJson(value)}>{value.eventType}</button>
          ))}
        </div>
        <div className="overview-journal-json-container">
          {currentJson && (
            <ReactJson name={`${currentJson.key}`}
                       style={{padding: "1rem", height: "calc(100% - 33px)", overflow: "auto"}}
                       theme="monokai"
                       collapsed={4}
                       src={currentJson}
                       displayArrayKey={false}
                       displayDataTypes={false}
                       displayObjectSize={false}
                       enableClipboard={false}/>
          )}
        </div>
      </div>
    )
  );
}


function Overview() {
  const entries = Object.values(dictionary);
  const [currentJson, setCurrentJson] = React.useState(null);
  return (
    entries && (
      <div className="overview-container">
        <div className="overview-list-container">
          {entries.map(value => (
            <button className="overview-key" key={value.uniqueId}
                    onClick={() => setCurrentJson(value)}>{value.key}</button>
          ))}
        </div>
        <div className="overview-json-container">
          {currentJson && (
            <ReactJson name={`${currentJson.key} - ${currentJson.state?.status}`}
                       style={{padding: "1rem", height: "calc(100% - 33px)", overflow: "auto"}}
                       theme="monokai"
                       collapsed={3}
                       src={currentJson}
                       displayArrayKey={false}
                       displayDataTypes={false}
                       displayObjectSize={false}
                       enableClipboard={false}/>
          )}
        </div>
      </div>
    )
  );
}


export default App;

