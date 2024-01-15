import * as React from "react";
import { useDevtoolsAgent } from "./Context";
import { NpmDevtoolsAgent, SingleInstanceInfo } from "./NpmDevtools";
import { useData } from "react-async-states";

export function DevtoolsSideBar() {
  let devtools = useDevtoolsAgent();
  let [query, setQuery] = React.useState("");
  let { data, state } = useData(devtools.info.actions);
  let { data: currentInstance } = useData(devtools.current.actions);

  let filteredInstances = React.useMemo(
    () =>
      Object.values(data!).filter((t) =>
        t.key.toLowerCase().includes(query.toLowerCase())
      ),
    [data, query]
  );

  return (
    <aside>
      <section className="asd-i-list">
        <form
          className="asd-filter-form"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(e.currentTarget.elements["query"].value.trim());
          }}
        >
          <input
            name="query"
            placeholder="filter by key"
            className="asd-i-item-filter"
          />
          <button type="submit">✔️</button>
          {query !== "" && <div className="asd-filtered"></div>}
          {query !== "" && (
            <button
              type="submit"
              title={`applied search: '${query}'`}
              onClick={(e) => {
                setQuery("");
                e.currentTarget.form.elements["query"].value = "";
              }}
            >
              ✖️
            </button>
          )}
        </form>

        {filteredInstances.map((instance) => (
          <MemoizedInstanceInfo
            {...instance}
            agent={devtools}
            name={instance.key}
            key={`${instance.id}`}
            current={currentInstance?.id === instance.id}
          />
        ))}
      </section>
    </aside>
  );
}

type InstanceInfoProps = SingleInstanceInfo & {
  name: string;
  current: boolean;
  agent: NpmDevtoolsAgent;
};

function InstanceInfo(props: InstanceInfoProps) {
  let itemClassName = `asd-i-item asd-i-item-${props.status} ${
    props.current ? "asd-i-current" : ""
  } `;
  return (
    <button
      onClick={() => {
        props.agent.setCurrentInstance(props.id);
      }}
      type="button"
      className={itemClassName}
      key={props.id}
    >
      <span className="asd-i-name">{props.name}</span>
      <div className="asd-i-badge">{props.subCount}</div>
    </button>
  );
}
const MemoizedInstanceInfo = React.memo(InstanceInfo);
