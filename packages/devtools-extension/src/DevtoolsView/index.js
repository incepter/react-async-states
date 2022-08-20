import React from "react";
import Layout from "antd/lib/layout";
import Select from "antd/lib/select";
import { useAsyncState, useSource, } from "react-async-states";
import {
  currentState,
  gatewaySource,
  journalSource,
  keysSource, updatesMeter
} from "./sources";
import CurrentStateDisplay, { SideKey } from "./CurrentStateDisplay";

const {Header, Content, Sider} = Layout;

export function DevtoolsView() {
  useAsyncState.auto(gatewaySource);

  return (
    <Layout className='main-bg' style={{height: '100vh', overflow: "auto"}}>
      <SiderDisplay/>
      <Content
        style={{padding: 8}}
      >
        <CurrentStateDisplay/>
      </Content>
    </Layout>
  );
}

const initialSort = {
  by: "lastUpdated",
  direction: "desc",
};

const sortOptions = [
  {
    label: "Creation date asc",
    value: "uniqueId|asc",
    sort: {
      by: "uniqueId",
      direction: "asc",
    },
  },
  {
    label: "Creation date desc",
    value: "uniqueId|desc",
    sort: {
      by: "uniqueId",
      direction: "desc",
    },
  },
  {
    label: "Key asc",
    value: "key|asc",
    sort: {
      by: "key",
      direction: "asc",
    },
  },
  {
    label: "Key desc",
    value: "key|desc",
    sort: {
      by: "key",
      direction: "desc",
    },
  },
  {
    label: "Last updated asc",
    value: "lastUpdated|asc",
    sort: {
      by: "lastUpdated",
      direction: "asc",
    },
  },
  {
    label: "Last updated desc",
    value: "lastUpdated|desc",
    sort: {
      by: "lastUpdated",
      direction: "desc",
    },
  },
];

function getSortFunction(sort) {
  return function sortFn(a, b) {
    const [uniqueId1, key1, timestamp1] = a;
    const [uniqueId2, key2, timestamp2] = b;
    if (sort.by === "uniqueId") {
      return sort.direction === "asc" ? uniqueId1 - uniqueId2 : uniqueId2 - uniqueId1;
    }
    if (sort.by === "key") {
      return sort.direction === "asc" ? key1.localeCompare(key2) : key2.localeCompare(key1);
    }
    if (sort.by === "lastUpdated") {
      return sort.direction === "asc" ? timestamp1 - timestamp2 : timestamp2 - timestamp1;
    }
    return 0;
  }
}

const SiderDisplay = React.memo(function () {
  const [sort, setSort] = React.useState(initialSort);
  const {state: {data}} = useSource(keysSource);
  const {state: {data: lane}} = useSource(currentState);
  const {state: {data: meter}} = useSource(updatesMeter);

  const currentSort = `${sort.by}|${sort.direction}`;

  const entries = React.useMemo(() => {
    const sortFn = getSortFunction(sort);
    return Object
      .entries(data)
      .map(([uniqueId, key]) => {
        return [uniqueId, key, journalSource.getLaneSource(uniqueId).getState().timestamp];
      })
      .sort(sortFn)
  }, [data, sort, meter]);

  return (
    <Sider className='main-bg' style={{
      height: '100vh',
      overflow: 'auto',
      padding: '0px 4px',
      borderRight: '1px dashed #C3C3C3',
    }} width={300}>
      <Header className='main-bg' style={{
        height: 40,
        display: "flex",
        position: "fixed",
        padding: "0px 8px",
        alignItems: "center",
      }}>
        <label className="main-color" htmlFor="sort">Sort by: </label>
        <Select style={{height: 32, marginLeft: 8}} id="sort"
                value={currentSort}
                options={sortOptions}
                onChange={(_, option) => setSort(option.sort)}/>
      </Header>
      <Content
        style={{
          top: 40,
          height: 'calc(100vh - 45px)',
          overflow: 'auto',
          marginTop: 40
        }}>
        <div style={{display: "flex", flexDirection: "column"}}>
          <div style={{display: "flex", flexDirection: "column"}}>
            {entries.map(([uniqueId, key]) => <SideKey key={uniqueId}
                                                       uniqueId={uniqueId}
                                                       asyncStateKey={key}
                                                       isCurrent={uniqueId === lane}
            />)}
          </div>
        </div>
      </Content>
    </Sider>
  );
});
