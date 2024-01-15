import * as React from "react";

import { VariantProps, cva } from "class-variance-authority";

import { clsxm } from "@/lib/utils";

const badgeVariants = cva("inline-flex text-xs px-1 rounded-sm uppercase", {
  defaultVariants: {
    variant: "soft",
    color: "default",
  },
  variants: {
    variant: {
      soft: "bg-opacity-15",
    },
    color: {
      default: "bg-foreground-primary text-background",
      success: "bg-success text-success",
      error: "bg-error text-error",
      info: "bg-info text-info",
      warning: "bg-warning text-warning",
    },
  },
});

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string | undefined;
}

const Badge = React.forwardRef<React.ElementRef<"span">, BadgeProps>(
  (props, ref) => {
    const { children, color, variant, className, ...rest } = props;

    return (
      <span
        className={clsxm(badgeVariants({ className, color, variant }))}
        ref={ref}
        {...rest}
      >
        {children}
      </span>
    );
  },
);
Badge.displayName = "Badge";

export default Badge;
