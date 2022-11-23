import * as React from "react";
import {useSource} from "react-async-states";
import {
  currentState,
  journalSource,
  keysSource,
  updatesMeter,
} from "./sources";
import {SideKey} from "./CurrentStateDisplay";

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
    const {
      data: [uniqueId1, key1, timestamp1],
    } = a;
    const {
      data: [uniqueId2, key2, timestamp2],
    } = b;
    if (sort.by === "uniqueId") {
      return sort.direction === "asc"
        ? uniqueId1 - uniqueId2
        : uniqueId2 - uniqueId1;
    }
    if (sort.by === "key") {
      return sort.direction === "asc"
        ? key1.localeCompare(key2)
        : key2.localeCompare(key1);
    }
    if (sort.by === "lastUpdated") {
      return sort.direction === "asc"
        ? timestamp1 - timestamp2
        : timestamp2 - timestamp1;
    }
    return 0;
  };
}

const SiderDisplay = React.memo(function () {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState(initialSort);
  const {
    state: {data},
  } = useSource(keysSource);
  const {
    state: {data: lane},
  } = useSource(currentState);
  const {
    state: {data: meter},
  } = useSource(updatesMeter);

  const currentSort = `${sort.by}|${sort.direction}`;

  const entries = React.useMemo<any>(() => {
    const sortFn = getSortFunction(sort);
    let keysAndUniqueIds = Object.entries(data);
    if (search) {
      keysAndUniqueIds = keysAndUniqueIds.filter(([, key]) =>
        (key as string)?.includes(search)
      );
    }

    let instancesGroupingMap = {};
    keysAndUniqueIds.forEach(([id, key]) => {
      let laneState = journalSource.getLaneSource(id).getState();
      // @ts-ignore
      let {parent} = laneState.data ?? {};

      if (parent?.uniqueId) {
        if (!instancesGroupingMap[parent.uniqueId]) {
          instancesGroupingMap[parent.uniqueId] = {
            data: [parent.uniqueId, parent.key],
            children: [[id, key, laneState.timestamp]],
          };
        } else {
          instancesGroupingMap[parent.uniqueId].children.push([
            id,
            key,
            laneState.timestamp,
          ]);
        }
      } else {
        if (!instancesGroupingMap[id]) {
          instancesGroupingMap[id] = {
            data: [id, key, laneState.timestamp],
            children: [],
          };
        }
      }
    });

    return Object.values(instancesGroupingMap).sort(sortFn);
  }, [data, sort, meter, search]);

  return (
    <div
      className="main-bg scroll-y-auto"
      style={{
        height: "auto",
        overflow: "auto",
        padding: "0px 8px",
        borderRight: "1px dashed #C3C3C3",
        width: 250,
      }}
    >
      <div
        className="main-bg"
        style={{
          zIndex: 1,
          height: 40,
          padding: "0px 8px",
        }}
      >
        <div
          style={{
            height: 40,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <select
            className="sorter"
            style={{
              borderRadius: 20,
              width: "100%",
              color: "#000",
              padding: "3px 7px",
            }}
            value={currentSort}
            onChange={(e) => {
              const data = JSON.parse(
                e.target.options[e.target.options.selectedIndex]?.dataset
                  ?.sort ?? ""
              );
              setSort(data);
            }}
          >
            {sortOptions?.map((option) => (
              <option
                data-sort={JSON.stringify(option.sort)}
                key={option?.value}
                value={option?.value}
              >
                {option?.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div
        className="scroll-y-auto"
        style={{
          top: 40,
          height: '100%',
          overflow: "auto",
          marginTop: 40,
        }}
      >
        <div
          style={{display: "flex", flexDirection: "column", color: "#000"}}
        >
          <input
            placeholder="search by key"
            style={{borderRadius: 24, padding: "3px 7px"}}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div
            style={{display: "flex", marginTop: 8, flexDirection: "column"}}
          >
            {entries.map(({data: [uniqueId, key], children}) => (
              <SideKey
                key={uniqueId}
                uniqueId={uniqueId}
                asyncStateKey={key}
                isCurrent={lane === uniqueId}
                lanes={children}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
export default SiderDisplay;
