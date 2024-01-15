"use client";

import { ThemeProvider } from "next-themes";

import { Provider as AsyncStatesProvider } from "react-async-states";
import { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { InstancesProvider } from "@/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SkeletonTheme
        borderRadius="0"
        baseColor="hsl(var(--color-foreground-secondary)/.2)"
        enableAnimation={false}
      >
        <AsyncStatesProvider id="playground">
          <InstancesProvider>{children}</InstancesProvider>
        </AsyncStatesProvider>
      </SkeletonTheme>
    </ThemeProvider>
  );
}
