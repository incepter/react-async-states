"use client";

import * as React from "react";

import { clsxm } from "@/lib/utils";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

export interface ToggleGroupItemProps
  extends ToggleGroupPrimitive.ToggleGroupItemProps {}

const Item = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ children, className, ...rest }, ref) => (
  <ToggleGroupPrimitive.Item
    className={clsxm(
      "transition-colors duration-200 hover:bg-foreground-primary/5 data-[state='on']:bg-primary/20 data-[state='on']:text-primary",
      className,
    )}
    ref={ref}
    {...rest}
  >
    {children}
  </ToggleGroupPrimitive.Item>
));
Item.displayName = ToggleGroupPrimitive.Item.displayName;

export interface ToggleGroupProps extends ToggleGroupPrimitive.ToggleProps {}

const ToggleGroupRoot = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ children, ...rest }, ref) => (
  <ToggleGroupPrimitive.Root ref={ref} {...rest}>
    {children}
  </ToggleGroupPrimitive.Root>
));
ToggleGroupRoot.displayName = ToggleGroupPrimitive.Root.displayName;

type ToggleGroupRootType = typeof ToggleGroupRoot;
type CompoundedComponent = ToggleGroupRootType & {
  Item: typeof Item;
};

const ToggleGroup = ToggleGroupRoot as CompoundedComponent;

ToggleGroup.Item = Item;

export default ToggleGroup;
