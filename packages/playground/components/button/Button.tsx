import * as React from "react";

import { type VariantProps, cva } from "class-variance-authority";

import { clsxm } from "@/lib/utils";

import { Slot } from "@radix-ui/react-slot";

const buttonVariants = cva(
  "inline-flex items-center justify-center hover:bg-error-light active:bg-error-dark",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-8 px-4",
      },
      variant: {
        default:
          "bg-primary text-primary-contrast-text hover:bg-primary-light active:bg-primary-dark",
        error:
          "bg-error text-error-contrast-text hover:bg-error-light active:bg-error-dark",
      },
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={clsxm(buttonVariants({ className, size, variant }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export default Button;
