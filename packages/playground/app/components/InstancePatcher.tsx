import { useState } from "react";

import { Collapsible, CollapsibleProps, Switch } from "@/components";

import { clsxm } from "@/lib/utils";

import ThemeToggleGroup from "./ThemeToggleGroup";
import {
  CacheControlGroupInputs,
  PendingControlGroupInputs,
  ProducerControlGroupInputs,
  RunEffectControlGroupInputs,
  SourceControlGroupInputs,
} from "./group-inputs";
import { AnyInstance } from "@/types/lib";

interface ControlGroupProps extends CollapsibleProps {
  title: string;
  collapsable?: boolean;
}

function ControlGroup(props: ControlGroupProps) {
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

export default function InstanceConfigPatcher({
  instance,
}: {
  instance: AnyInstance;
}) {
  return (
    <div>
      <ThemeToggleGroup />

      <ControlGroup title="Source">
        <SourceControlGroupInputs instance={instance} />
      </ControlGroup>

      <ControlGroup title="Producer">
        <ProducerControlGroupInputs instance={instance} />
      </ControlGroup>

      <ControlGroup
        collapsable
        title="Pending (ms)"
        defaultOpen={!instance.config.skipPendingStatus}
        onOpenChange={(open) => {
          instance.actions.patchConfig({
            skipPendingStatus: !open,
          });
        }}
      >
        <PendingControlGroupInputs instance={instance} />
      </ControlGroup>

      <ControlGroup
        collapsable
        title="Run effect"
        defaultOpen={!!instance.config.runEffect}
        onOpenChange={(open) => {
          if (!open) {
            instance.actions.patchConfig({
              runEffect: undefined,
            });
          }
        }}
      >
        <RunEffectControlGroupInputs instance={instance} />
      </ControlGroup>

      <ControlGroup
        collapsable
        title="Cache"
        defaultOpen={!!instance.config.cacheConfig?.enabled}
        onOpenChange={(open) => {
          instance.actions.patchConfig({
            cacheConfig: {
              enabled: open,
            },
          });
        }}
      >
        <CacheControlGroupInputs instance={instance} />
      </ControlGroup>
    </div>
  );
}
