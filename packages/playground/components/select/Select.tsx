"use client";

import * as React from "react";

import { clsxm } from "@/lib/utils";

import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";

import * as SelectPrimitive from "@radix-ui/react-select";

const Icon = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Icon>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Icon>
>(({ children, className, ...rest }, ref) => (
  <SelectPrimitive.Icon
    className={clsxm("text-foreground-secondary", className)}
    ref={ref}
    {...rest}
  >
    {children}
  </SelectPrimitive.Icon>
));
Icon.displayName = SelectPrimitive.Icon.displayName;

const Trigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ children, className, ...rest }, ref) => (
  <SelectPrimitive.Trigger
    className={clsxm(
      "inline-flex h-8 items-center gap-2 border border-foreground-secondary/20 px-2 text-left leading-none text-foreground-secondary placeholder-foreground-secondary hover:border-foreground-secondary/60 focus:border-foreground-secondary focus:outline-none",
      className,
    )}
    ref={ref}
    {...rest}
  >
    {children}
  </SelectPrimitive.Trigger>
));
Trigger.displayName = SelectPrimitive.Trigger.displayName;

const Item = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ children, className, ...rest }, ref) => (
  <SelectPrimitive.Item
    className={clsxm(
      "relative flex h-8 select-none items-center px-6 leading-none text-foreground-secondary outline-none data-[highlighted]:bg-primary data-[highlighted]:text-primary-contrast-text",
      className,
    )}
    ref={ref}
    {...rest}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="absolute left-0 inline-flex w-6 items-center justify-center">
      <CheckIcon />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));
Item.displayName = SelectPrimitive.Item.displayName;

const Value = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Value>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
>(({ children, className, ...rest }, ref) => (
  <span
    className={clsxm(
      "overflow-hidden text-ellipsis whitespace-nowrap",
      className,
    )}
  >
    <SelectPrimitive.Value ref={ref} {...rest}>
      {children}
    </SelectPrimitive.Value>
  </span>
));
Value.displayName = SelectPrimitive.Value.displayName;

const Content = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ children, className, ...rest }, ref) => (
  <SelectPrimitive.Content
    className={clsxm(
      "z-10 border border-foreground-secondary/20 bg-neutral p-2 text-foreground-primary shadow-md",
      className,
    )}
    ref={ref}
    {...rest}
  >
    {children}
  </SelectPrimitive.Content>
));
Content.displayName = SelectPrimitive.Content.displayName;

const Viewport = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Viewport>
>(({ children, ...rest }, ref) => (
  <SelectPrimitive.Viewport {...rest}>{children}</SelectPrimitive.Viewport>
));
Viewport.displayName = SelectPrimitive.Viewport.displayName;

export interface SelectProps extends SelectPrimitive.SelectProps {
  placeholder?: SelectPrimitive.SelectValueProps["placeholder"];
  className?: string;
}

const SelectRoot: React.FC<SelectProps> = (props) => {
  const { children, className, placeholder, ...rest } = props;

  return (
    <SelectPrimitive.Root {...rest}>
      <Trigger className={clsxm("flex text-foreground-secondary", className)}>
        <Value className="flex-1" placeholder={placeholder} />
        <Icon>
          <ChevronDownIcon />
        </Icon>
      </Trigger>
      <Content>
        <Viewport>{children}</Viewport>
      </Content>
    </SelectPrimitive.Root>
  );
};
SelectRoot.displayName = SelectPrimitive.Root.displayName;

type SelectRootType = typeof SelectRoot;
type CompoundedComponent = SelectRootType & {
  Icon: typeof Icon;
  Item: typeof Item;
  Value: typeof Value;
  Content: typeof Content;
  Trigger: typeof Trigger;
  Viewport: typeof Viewport;
};

const Select = SelectRoot as CompoundedComponent;

Select.Icon = Icon;
Select.Item = Item;
Select.Value = Value;
Select.Content = Content;
Select.Trigger = Trigger;
Select.Viewport = Viewport;

export default Select;
