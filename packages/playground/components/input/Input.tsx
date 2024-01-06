"use client";

import * as React from "react";

import { clsxm } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { className, ...rest } = props;

  return (
    <input
      className={clsxm(
        "h-8 gap-2 border border-foreground-secondary/20 bg-transparent px-2 leading-none text-foreground-secondary placeholder-foreground-secondary hover:border-foreground-secondary/60 focus:border-foreground-secondary focus:outline-none",
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});
Input.displayName = "Input";

export default Input;
