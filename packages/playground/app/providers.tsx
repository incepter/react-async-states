"use client";

import { ThemeProvider } from "next-themes";

import { Provider as AsyncStatesProvider } from "react-async-states";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AsyncStatesProvider id="playground">{children}</AsyncStatesProvider>
    </ThemeProvider>
  );
}
