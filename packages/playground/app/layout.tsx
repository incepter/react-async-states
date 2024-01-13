import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";

import ControlPanel from "./components/ControlPanel";
import ProducerRunner from "./components/ProducerRunner";
import StateTimeline from "./components/StateTimeline";
import { Providers } from "./providers";
import "@/styles/globals.css";

const ubuntu = Ubuntu({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "React Async States - Playground",
  description: "Where you can play with react-async-states features",
  keywords: [
    "react",
    "javascript",
    "events",
    "typescript",
    "react-native",
    "state-management",
    "react-dom",
    "async",
    "websocket",
    "cache",
    "state",
    "workers",
    "throttle",
    "axios",
    "debounce",
    "fetch-api",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={ubuntu.className}>
        <Providers>
          <div className="flex h-svh w-svw overflow-hidden">
            <div className="flex flex-1 flex-col overflow-auto">
              <ProducerRunner />
              {children}
              <StateTimeline />
            </div>
            <ControlPanel />
          </div>
        </Providers>
      </body>
    </html>
  );
}
