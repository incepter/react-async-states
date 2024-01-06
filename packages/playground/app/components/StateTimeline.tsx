"use client";

import { ToggleGroup, ToggleGroupItemProps } from "@/components";

import { RadiobuttonIcon } from "@radix-ui/react-icons";

type StateRecord = {
  id: string;
  timestamp: number;
};

interface StateRecordToggleItemProps extends ToggleGroupItemProps {
  record: StateRecord;
}

function StateRecordToggleItem({
  record,
  ...props
}: StateRecordToggleItemProps) {
  const { timestamp } = record;

  return (
    <ToggleGroup.Item {...props}>
      <RadiobuttonIcon className="w-5 text-primary" />
      <span className="whitespace-nowrap text-sm text-foreground-secondary">
        {new Date(timestamp).toLocaleTimeString()}
      </span>
    </ToggleGroup.Item>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

const exampleStateRecords = [
  {
    id: "1",
    timestamp: 1704497864344,
  },
  {
    id: "2",
    timestamp: 1704497861344,
  },
  {
    id: "3",
    timestamp: 1704497854344,
  },
  {
    id: "4",
    timestamp: 1704497804344,
  },
  {
    id: "5",
    timestamp: 170449778344,
  },
  {
    id: "6",
    timestamp: 1704497714344,
  },
  {
    id: "7",
    timestamp: 1704497509344,
  },
  {
    id: "8",
    timestamp: 1704497400344,
  },
];

export default function StateTimeline() {
  // @TODO Some sort of state history visualization.

  const selectedRecord = exampleStateRecords[0];

  return (
    <div className="border-t border-foreground-secondary/20 bg-neutral">
      <ToggleGroup
        type="single"
        className="flex flex-row-reverse overflow-auto"
        defaultValue={selectedRecord.id}
      >
        {exampleStateRecords.map((record) => (
          <StateRecordToggleItem
            value={record.id}
            className="flex flex-col items-center gap-2 p-4"
            key={record.id}
            record={record}
          >
            <RadiobuttonIcon className="w-5" />
            <span className="whitespace-nowrap text-sm text-foreground-secondary">
              {new Date(record.timestamp).toLocaleTimeString()}
            </span>
          </StateRecordToggleItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
