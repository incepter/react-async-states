"use client";

import { useEffect, useState } from "react";
import { Producer, ProducerConfig, State, useAsync } from "react-async-states";

import { Badge, ToggleGroup, ToggleGroupItemProps } from "@/components";

import { getColorForStateStatus } from "@/lib/mapping";
import { randomKey } from "@/lib/random";
import { setInstanceStateAndNotifySubscribers } from "@/lib/state";
import { clsxm } from "@/lib/utils";

import { useCurrentInstance } from "@/hooks";

import { RadiobuttonIcon } from "@radix-ui/react-icons";

interface StateSnapshot<TData, TArgs extends unknown[], TError> {
  key: string;
  state: State<unknown, [], Error>;
  config: ProducerConfig<TData, TArgs, TError>;
  producer: Producer<TData, TArgs, TError> | null;
}

interface StateSnapshotToggleItemProps extends ToggleGroupItemProps {
  snapshot: StateSnapshot<any, any, any>;
}

function StateSnapshotToggleItem({
  snapshot,
  className,
  ...props
}: StateSnapshotToggleItemProps) {
  const { state } = snapshot;

  return (
    <ToggleGroup.Item className={clsxm("group", className)} {...props}>
      <RadiobuttonIcon className="w-5 text-primary group-data-[state='off']:text-foreground-secondary" />
      <span className="whitespace-nowrap text-sm text-foreground-secondary">
        {new Date(state.timestamp).toLocaleTimeString()}
      </span>
      <Badge color={getColorForStateStatus(state.status)}>{state.status}</Badge>
    </ToggleGroup.Item>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

export default function StateTimeline() {
  const { instance: currentInstance } = useCurrentInstance();

  const [selectedSnapshotKey, setSelectedSnapshotKey] = useState<string>();
  const [snapshots, setSnapshots] = useState<StateSnapshot<any, any, any>[]>(
    [],
  );

  useEffect(() => {
    const unsubscribe = currentInstance.actions.on("change", (newState) => {
      let snapshot = {
        key: "stateSnapshot$" + randomKey(),
        state: newState,
        config: { ...currentInstance.config },
        producer: currentInstance.fn,
      };

      setSnapshots((prev) => [snapshot, ...prev]);
      setSelectedSnapshotKey(snapshot.key);
    });

    return unsubscribe;
  }, [currentInstance]);

  function handleSnapshotToggleItemClick(snapshot: (typeof snapshots)[number]) {
    setInstanceStateAndNotifySubscribers(currentInstance, snapshot.state);
  }

  if (snapshots.length === 0) {
    return null;
  }

  console.log(currentInstance.config);

  return (
    <div className="border-t border-foreground-secondary/20 bg-neutral">
      <ToggleGroup
        type="single"
        className="flex flex-row-reverse overflow-auto"
        value={selectedSnapshotKey}
        onValueChange={(value) => {
          if (value) {
            setSelectedSnapshotKey(value);
          }
        }}
      >
        {snapshots.map((snapshot) => (
          <StateSnapshotToggleItem
            value={snapshot.key}
            className="flex flex-col items-center gap-2 p-4 duration-[500ms]"
            key={snapshot.key}
            snapshot={snapshot}
            onClick={() => {
              handleSnapshotToggleItemClick(snapshot);
            }}
          />
        ))}
      </ToggleGroup>
    </div>
  );
}
