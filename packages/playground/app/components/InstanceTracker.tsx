import { useEffect, useState } from "react";

import { Badge, ToggleGroup } from "@/components";

import { getColorForStateStatus } from "@/lib/mapping";
import { randomKey } from "@/lib/random";
import { setInstanceStateAndNotifySubscribers } from "@/lib/state";

import { AnyInstance, AnyProducerConfig, AnyState } from "@/types/lib";

import { RadiobuttonIcon } from "@radix-ui/react-icons";

interface StateSnapshot {
  key: string;
  state: AnyState;
  config: AnyProducerConfig;
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
      {snapshots.map(({ key, state }) => (
        <ToggleGroup.Item
          value={key}
          className="group flex flex-col items-center gap-2 p-4 duration-[500ms]"
          key={key}
          onClick={() => setInstanceStateAndNotifySubscribers(instance, state)}
        >
          <RadiobuttonIcon className="w-5 text-primary group-data-[state='off']:text-foreground-secondary" />
          <span className="whitespace-nowrap text-sm text-foreground-secondary">
            {new Date(state.timestamp).toLocaleTimeString()}
          </span>
          <Badge color={getColorForStateStatus(state.status)}>
            {state.status}
          </Badge>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup>
  );
}
