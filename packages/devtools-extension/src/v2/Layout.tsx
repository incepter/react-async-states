import * as React from "react";
import { DevtoolsAgentProvider } from "./Context";

type LayoutProps = {
	sidebar: React.ReactNode;
	details: React.ReactNode;
};
export function DevtoolsLayout(props: LayoutProps) {
	return (
		<DevtoolsAgentProvider>
			<div className="asd-root">
				<div className="asd-side asc-s-y-auto">{props.sidebar}</div>
				<div className="asd-view asc-s-y-auto">{props.details}</div>
			</div>
		</DevtoolsAgentProvider>
	);
}
