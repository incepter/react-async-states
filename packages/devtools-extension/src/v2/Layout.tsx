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
				<div className="asd-side">{props.sidebar}</div>
				<div className="asd-view">{props.details}</div>
			</div>
		</DevtoolsAgentProvider>
	);
}
