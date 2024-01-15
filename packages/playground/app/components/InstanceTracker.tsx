import { useEffect, useState } from "react";

import { Badge, ToggleGroup } from "@/components";

import { getColorForStateStatus } from "@/lib/mapping";
import { randomKey } from "@/lib/random";
import { setInstanceStateAndNotifySubscribers } from "@/lib/state";

import { AnyInstance, AnyProducerConfig, AnyState } from "@/types/lib";

interface StateSnapshot {
  key: string;
  state: AnyState;
  config: AnyProducerConfig;
  sourceKey: string;
}

export default function InstanceTracker({
  instance,
}: {
  instance: AnyInstance;
}) {
  const [selectedSnapshotKey, setSelectedSnapshotKey] = useState<string>();
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);

  useEffect(() => {
    const unsubscribe = instance.actions.on("change", (newState) => {
      let snapshot = {
        key: "stateSnapshot$" + randomKey(),
        state: newState,
        config: { ...instance.config },
        sourceKey: instance.key,
      };

      setSnapshots((prev) => [snapshot, ...prev]);
      setSelectedSnapshotKey(snapshot.key);
    });

    return unsubscribe;
  }, [instance]);

  if (snapshots.length === 0) {
    return (
      <div className="p-4 text-center">
        <h5 className="text-lg font-medium">State Traveling ✈️</h5>
        <p className="text-foreground-secondary">
          The state timeline will be shown here so you can jump between states.
        </p>
      </div>
    );
  }

  return (
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
      {snapshots.map(({ key, sourceKey, state }) => (
        <ToggleGroup.Item
          value={key}
          className="group text-sm duration-[500ms]"
          key={key}
          onClick={() => setInstanceStateAndNotifySubscribers(instance, state)}
        >
          <div className="border-b border-foreground-secondary/20 px-4 py-1 group-data-[state='off']:text-foreground-secondary">
            {sourceKey}
          </div>
          <div className="flex flex-col items-center gap-2 p-4">
            <span className="whitespace-nowrap text-foreground-secondary">
              {new Date(state.timestamp).toLocaleTimeString()}
            </span>
            <Badge color={getColorForStateStatus(state.status)}>
              {state.status}
            </Badge>
          </div>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup>
  );
}
