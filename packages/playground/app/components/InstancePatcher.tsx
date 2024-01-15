import { useState } from "react";

import { Collapsible, CollapsibleProps, Switch } from "@/components";

import { clsxm } from "@/lib/utils";

import ThemeToggleGroup from "./ThemeToggleGroup";
import {
  CachePartialConfigControls,
  PendingPartialConfigControls,
  ProducerControls,
  RunEffectPartialConfigControls,
  SourceControls,
} from "./controls";
import { AnyInstance } from "@/types/lib";

interface CollapsibleControlGroupProps extends CollapsibleProps {
  title: string;
  collapsable?: boolean;
}

function CollapsibleControlGroup(props: CollapsibleControlGroupProps) {
  const { title, children, className, collapsable, defaultOpen, ...rest } =
    props;

  const [open, setOpen] = useState(defaultOpen);

  const Content = collapsable ? Collapsible.Content : "div";

  return (
    <Collapsible
      open={open}
      className={clsxm(
        "space-y-4 border-b border-foreground-secondary/20 p-4 text-sm",
        className,
      )}
      {...rest}
    >
      <div className="flex items-center gap-2">
        <h6 className="flex-1 font-medium">{title}</h6>
        {collapsable && (
          <Collapsible.Trigger className="leading-none" asChild>
            <div>
              <Switch
                onCheckedChange={(checked) => setOpen(checked)}
                checked={open}
              />
            </div>
          </Collapsible.Trigger>
        )}
      </div>

      <Content className="text-sm">{children}</Content>
    </Collapsible>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

export default function InstancePatcher({
  instance,
}: {
  instance: AnyInstance;
}) {
  const instConfig = instance.config;

  return (
    <div>
      <ThemeToggleGroup />

      <CollapsibleControlGroup title="Source">
        <SourceControls instance={instance} />
      </CollapsibleControlGroup>

      <CollapsibleControlGroup title="Producer">
        <ProducerControls instance={instance} />
      </CollapsibleControlGroup>

      <CollapsibleControlGroup
        collapsable
        title="Pending (ms)"
        defaultOpen={!instConfig.skipPendingStatus}
        onOpenChange={(open) => {
          instance.actions.patchConfig({
            skipPendingStatus: !open,
          });
        }}
      >
        <PendingPartialConfigControls instance={instance} />
      </CollapsibleControlGroup>

      <CollapsibleControlGroup
        collapsable
        title="Run effect"
        defaultOpen={!!instConfig.runEffect}
        onOpenChange={(open) => {
          if (!open) {
            instance.actions.patchConfig({
              runEffect: undefined,
            });
          }
        }}
      >
        <RunEffectPartialConfigControls instance={instance} />
      </CollapsibleControlGroup>

      <CollapsibleControlGroup
        collapsable
        title="Cache"
        defaultOpen={!!instConfig.cacheConfig?.enabled}
        onOpenChange={(open) => {
          instance.actions.patchConfig({
            cacheConfig: {
              ...instConfig.cacheConfig,
              enabled: open,
            },
          });
        }}
      >
        <CachePartialConfigControls instance={instance} />
      </CollapsibleControlGroup>
    </div>
  );
}
