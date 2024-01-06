"use client";

import * as React from "react";

import { clsxm } from "@/lib/utils";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Trigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger>
>(({ children, className, ...rest }, ref) => (
  <CollapsiblePrimitive.Trigger
    className={clsxm("", className)}
    ref={ref}
    {...rest}
  >
    {children}
  </CollapsiblePrimitive.Trigger>
));
Trigger.displayName = CollapsiblePrimitive.Trigger.displayName;

const Content = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ children, className, ...rest }, ref) => (
  <CollapsiblePrimitive.Content
    className={clsxm("", className)}
    ref={ref}
    {...rest}
  >
    {children}
  </CollapsiblePrimitive.Content>
));
Content.displayName = CollapsiblePrimitive.Content.displayName;

export interface CollapsibleProps
  extends CollapsiblePrimitive.CollapsibleProps {}

const CollapsibleRoot: React.FC<CollapsibleProps> = (props) => {
  const { children, className, ...rest } = props;

  return (
    <CollapsiblePrimitive.Root className={clsxm("", className)} {...rest}>
      {children}
    </CollapsiblePrimitive.Root>
  );
};
CollapsibleRoot.displayName = CollapsiblePrimitive.Root.displayName;

type CollapsibleRootType = typeof CollapsibleRoot;
type CompoundedComponent = CollapsibleRootType & {
  Trigger: typeof Trigger;
  Content: typeof Content;
};

const Collapsible = CollapsibleRoot as CompoundedComponent;

Collapsible.Trigger = Trigger;
Collapsible.Content = Content;

export default Collapsible;
