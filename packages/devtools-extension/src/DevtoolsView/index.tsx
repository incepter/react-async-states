import * as React from "react";
import { useAsyncState } from "react-async-states";
import { gatewaySource } from "./sources";
import CurrentStateDisplay from "./CurrentStateDisplay";
import SiderDisplay from "./SiderDisplay";
import { DevtoolsProvider } from "./context";

export function DevtoolsView({
	useDevMode,
	onClose,
}: {
	useDevMode?: boolean;
	onClose?: Function;
}) {
	useAsyncState.auto(
		{
			source: gatewaySource,
			payload: { dev: useDevMode ?? true },
		},
		[useDevMode]
	);

	return (
		<DevtoolsProvider dev={useDevMode}>
			<div
				className="main-bg scroll-y-auto devtools-root-animated"
				style={{ height: "100%", overflow: "auto" }}
			>
				{onClose && (
					<button
						style={{
							zIndex: 9,
							top: "16px",
							right: "16px",
							position: "absolute",
							borderRadius: 100,
							width: 50,
							height: 50,
							color: "#000",
							cursor: "pointer",
						}}
						onClick={() => onClose()}
					>
						X
					</button>
				)}
				<div
					className="main-bg scroll-y-auto flex flex-row"
					style={{ height: "100%", overflow: "auto" }}
				>
					<SiderDisplay />
					<CurrentStateDisplay />
				</div>
			</div>
		</DevtoolsProvider>
	);
}
