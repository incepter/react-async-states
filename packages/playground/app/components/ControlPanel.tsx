"use client";

import { useState } from "react";
import { useAsync } from "react-async-states";

import { Collapsible, Switch } from "@/components";

import { randomKey } from "@/lib/random";
import { clsxm } from "@/lib/utils";

import ThemeToggleGroup from "./ThemeToggleGroup";
import {
  CacheControlGroupInputs,
  PendingControlGroupInputs,
  ProducerControlGroupInputs,
  RunEffectControlGroupInputs,
  SourceControlGroupInputs,
} from "./group-inputs";
import { useCurrentInstance } from "@/hooks";

interface ControlGroupProps extends React.ComponentProps<"div"> {
  title: string;
  collapsable?: boolean;
  onCollapse?: (expanded: boolean) => void;
}

function ControlGroup(props: ControlGroupProps) {
  const {
    title,
    children,
    className,
    onCollapse,
    collapsable,
    defaultChecked,
    ...rest
  } = props;

  const [open, setOpen] = useState(!collapsable || defaultChecked);

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
              <Switch onCheckedChange={onCollapse} checked={open} />
            </div>
          </Collapsible.Trigger>
        )}
      </div>

      <Collapsible.Content className="text-xs">{children}</Collapsible.Content>
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
];

function CacheControlGroup() {
  const { instance: currentInstance } = useCurrentInstance();

  function handleControlGroupCollapsedChange(expanded: boolean) {
    currentInstance.actions.patchConfig({
      cacheConfig: {
        enabled: expanded,
      },
    });
  }

  return (
    <ControlGroup
      collapsable
      title="Cache"
      onCollapse={handleControlGroupCollapsedChange}
      defaultChecked={currentInstance.config.cacheConfig?.enabled}
    >
      <CacheControlGroupInputs />
    </ControlGroup>
  );
}

function RunEffectControlGroup() {
  const { instance: currentInstance } = useCurrentInstance();

  function handleControlGroupCollapsedChange(expanded: boolean) {
    if (!expanded) {
      currentInstance.actions.patchConfig({
        runEffect: undefined,
      });
    }
  }

  return (
    <ControlGroup
      collapsable
      title="Run effect"
      onCollapse={handleControlGroupCollapsedChange}
      defaultChecked={!!currentInstance.config.runEffect}
    >
      <RunEffectControlGroupInputs />
    </ControlGroup>
  );
}

function PendingControlGroup() {
  const { instance: currentInstance } = useCurrentInstance();

  function handleControlGroupCollapsedChange(expanded: boolean) {
    currentInstance.actions.patchConfig({
      skipPendingStatus: !expanded,
    });
  }

  return (
    <ControlGroup
      collapsable
      title="Pending status"
      defaultChecked={!currentInstance.config.skipPendingStatus}
      onCollapse={handleControlGroupCollapsedChange}
    >
      <PendingControlGroupInputs />
    </ControlGroup>
  );
}

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

      <PendingControlGroup />
      <RunEffectControlGroup />
      <CacheControlGroup />
    </div>
  );
}
