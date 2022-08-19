import React from "react";
import Layout from "antd/lib/layout";
import Select from "antd/lib/select";
import { useAsyncState, useSource, } from "react-async-states";
import {
  currentState,
  gatewaySource,
  journalSource,
  keysSource
} from "./sources";
import CurrentStateDisplay, { SideKey } from "./CurrentStateDisplay";

const {Header, Content, Sider} = Layout;

export function DevtoolsView() {
  useAsyncState.auto(gatewaySource);

  return (
    <Layout style={{height: '100vh'}}>
      <Header style={{height: 32}} className="header">
        <div className="logo"/>
      </Header>
      <Layout>
        <Sider width={300} className="site-layout-background">
          <SiderDisplay/>
        </Sider>
        <Layout>
          <Content
            style={{padding: 32}}
            className="site-layout-background"
          >
            <CurrentStateDisplay/>
          </Content>
        </Layout>
      </Layout>
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

  const currentSort = `${sort.by}|${sort.direction}`;

  const entries = React.useMemo(() => {
    const sortFn = getSortFunction(sort);
    return Object
      .entries(data)
      .map(([uniqueId, key]) => {
        return [uniqueId, key, journalSource.getLaneSource(uniqueId).getState().timestamp];
      })
      .sort(sortFn)
  }, [data, sort]);

  return (
    <div style={{display: "flex", flexDirection: "column"}}>
      <div>
        <label htmlFor="sort">Sort by: </label>
        <Select id="sort" value={currentSort} options={sortOptions}
                onChange={(_, option) => setSort(option.sort)}/>
      </div>
      <div style={{display: "flex", flexDirection: "column"}}>
        {entries.map(([uniqueId, key]) => <SideKey key={uniqueId}
                                                   uniqueId={uniqueId}
                                                   asyncStateKey={key}
                                                   isCurrent={uniqueId === lane}
        />)}
      </div>
    </div>
  );
});
