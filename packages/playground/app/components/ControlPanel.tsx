"use client";

import { useState } from "react";

import { Collapsible, Switch } from "@/components";

import { randomKey } from "@/lib/random";
import { clsxm } from "@/lib/utils";

import ThemeToggleGroup from "./ThemeToggleGroup";
import {
  CacheControlGroupInputs,
  ProducerControlGroupInputs,
  RunEffectControlGroupInputs,
  SourceControlGroupInputs,
  TimingControlGroupInputs,
} from "./group-inputs";

interface ControlGroupProps extends React.ComponentProps<"div"> {
  title: string;
  collapsable?: boolean;
}

function ControlGroup(props: ControlGroupProps) {
  const { title, children, className, collapsable = false, ...rest } = props;

  const [open, setOpen] = useState(!collapsable);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={clsxm(
        "space-y-4 border-b border-foreground-secondary/20 p-4 text-sm",
        className,
      )}
      {...rest}
    >
      <div className="flex items-center gap-2">
        <h6 className="flex-1 font-medium">{title}</h6>
        {collapsable && (
          <Collapsible.Trigger asChild>
            <div>
              <Switch checked={open} />
            </div>
          </Collapsible.Trigger>
        )}
      </div>

      <Collapsible.Content>
        <div className="text-xs">{children}</div>
      </Collapsible.Content>
    </Collapsible>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

const controlGroupItems: ControlGroupProps[] = [
  {
    title: "Source",
    children: <SourceControlGroupInputs />,
  },
  {
    title: "Producer",
    children: <ProducerControlGroupInputs />,
  },
  {
    title: "Run effect",
    children: <RunEffectControlGroupInputs />,
  },
  {
    title: "Timing (ms)",
    children: <TimingControlGroupInputs />,
  },
  {
    title: "Cache",
    collapsable: true,
    children: <CacheControlGroupInputs />,
  },
];

export default function ControlPanel() {
  return (
    <div className="w-3/12 min-w-[200px] max-w-[300px] overflow-auto border-l border-foreground-secondary/20 bg-neutral pb-4">
      <ThemeToggleGroup />

      {controlGroupItems.map(({ children, ...rest }) => {
        const key = "controlGroup$" + randomKey();

        return (
          <ControlGroup key={key} {...rest}>
            {children}
          </ControlGroup>
        );
      })}
    </div>
  );
}
