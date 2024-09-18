import * as React from "react";
import { DevtoolsClientProvider } from "./DevtoolsClientProvider";

type LayoutProps = {
  sidebar: React.ReactNode;
  details: React.ReactNode;
};
export function DevtoolsLayout(props: LayoutProps) {
  return (
    <DevtoolsClientProvider>
      <div className="asd-root">
        <div className="asd-side asc-s-y-auto">{props.sidebar}</div>
        <div className="asd-view asc-s-y-auto">{props.details}</div>
      </div>
    </DevtoolsClientProvider>
  );
}
