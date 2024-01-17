"use client";

import { ThemeProvider } from "next-themes";
import { useServerInsertedHTML } from "next/navigation";

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
        <AsyncStatesProvider serverInsertedHtmlHook={useServerInsertedHTML}>
          <InstancesProvider>{children}</InstancesProvider>
        </AsyncStatesProvider>
      </SkeletonTheme>
    </ThemeProvider>
  );
}
