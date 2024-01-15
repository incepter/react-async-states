"use client";

import * as React from "react";

import { clsxm } from "@/lib/utils";

import * as SwitchPrimitive from "@radix-ui/react-switch";

const Thumb = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Thumb>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Thumb>
>(({ children, className, ...rest }, ref) => (
  <SwitchPrimitive.Thumb
    className={clsxm(
      "block h-4 w-4 rounded-full bg-white transition-transform ease-in-out will-change-transform data-[state='checked']:translate-x-3",
      className,
    )}
    ref={ref}
    {...rest}
  >
    {children}
  </SwitchPrimitive.Thumb>
));
Thumb.displayName = SwitchPrimitive.Thumb.displayName;

export interface SwitchProps extends SwitchPrimitive.SwitchProps {}

const SwitchRoot: React.FC<SwitchProps> = (props) => {
  const { children, className, placeholder, ...rest } = props;

  return (
    <SwitchPrimitive.Root
      className={clsxm(
        "relative h-4 w-7 min-w-7 rounded-full bg-gray-400 transition-colors ease-in-out focus:outline-none data-[state='checked']:bg-primary",
        className,
      )}
      {...rest}
    >
      <Thumb />
    </SwitchPrimitive.Root>
  );
};
SwitchRoot.displayName = SwitchPrimitive.Root.displayName;

type SwitchRootType = typeof SwitchRoot;
type CompoundedComponent = SwitchRootType & {
  Thumb: typeof Thumb;
};

const Switch = SwitchRoot as CompoundedComponent;

Switch.Thumb = Thumb;

export default Switch;
