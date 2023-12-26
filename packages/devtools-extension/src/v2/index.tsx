import * as React from "react";
import ReactDOM from "react-dom";
import ReactDOMClient from "react-dom/client";
import { __DEV__ } from "../utils";
import { DevtoolsSideBar } from "./Sidebar";
import { CurrentInstanceDetails } from "./Details";
import { DevtoolsLayout } from "./Layout";
import "../css-v2.css";

let asyncStatesDevtoolsId = "async-states-devtools";

export function autoConfigureDevtools(props?: { open?: boolean }) {
	if (!__DEV__) {
		return null;
	}
	let hostContainer = createHostContainer(asyncStatesDevtoolsId, {
		top: "50vh",
		width: "100%",
		height: "50vh",
		position: "absolute",
	});

	ReactDomRender(
		hostContainer,
		<InternalDevtools
			initiallyOpen={props?.open}
			wrapperStyle={{
				width: "100%",
				height: "100%",
				zIndex: 999999,
				position: "absolute",
			}}
			getRoot={() =>
				document.getElementById(asyncStatesDevtoolsId) as HTMLDivElement
			}
		/>
	);
}

function ReactDomRender(hostRoot, element) {
	if (ReactDOMClient && typeof ReactDOMClient.createRoot === "function") {
		const root = ReactDOMClient.createRoot(hostRoot);
		root.render(element);
	} else {
		ReactDOM.render(element, hostRoot);
	}
}

export function Devtools({
	initiallyOpen = false,
}: {
	initiallyOpen?: boolean;
}) {
	if (!__DEV__) {
		return null;
	}
	let ref = React.useRef<HTMLDivElement>();
	return (
		<div
			ref={ref}
			style={{
				top: "50vh",
				width: "100%",
				height: "50vh",
				position: "absolute",
			}}
		>
			<InternalDevtools
				initiallyOpen={initiallyOpen}
				getRoot={() => ref.current}
				wrapperStyle={{
					width: "100%",
					height: "100%",
					zIndex: 999999,
					position: "absolute",
				}}
			/>
		</div>
	);
}

function InternalDevtools({
	getRoot,
	wrapperStyle,
	wrapperClassname,
	initiallyOpen = false,
}: {
	getRoot: () => HTMLDivElement;
	wrapperStyle?: object;
	wrapperClassname?: string;
	initiallyOpen?: boolean;
}) {
	const [visible, setVisible] = React.useState(initiallyOpen);

	React.useEffect(() => {
		function listener(e) {
			if (e.key === "Escape") {
				setVisible((old) => !old);
			}
		}

		window && window.addEventListener("keydown", listener);

		return () => {
			window && window.removeEventListener("keydown", listener);
		};
	}, []);
	React.useEffect(() => {
		let autoConfiguredHostRoot = getRoot();
		if (visible) {
			autoConfiguredHostRoot.style.display = "block";
		} else {
			autoConfiguredHostRoot.style.display = "none";
		}
	}, [visible]);

	if (visible) {
		return (
			<div className={wrapperClassname} style={wrapperStyle}>
				<Resizer getRoot={getRoot} />
				<DevtoolsLayout
					sidebar={<DevtoolsSideBar />}
					details={<CurrentInstanceDetails />}
				/>
			</div>
		);
	}

	return null;
}

function makeResizable(
	target: HTMLElement | null | undefined,
	resizer: HTMLElement | null | undefined
) {
	function startCapture(e) {
		if (!target || !resizer) {
			return;
		}

		let startPosition = e.clientY;
		let top = target.style.top;
		let height = target.style.height;

		function updateHeight(delta: string) {
			target!.style.top = `calc(${top} - ${delta})`;
			target!.style.height = `calc(${height} + ${delta})`;
		}

		function stopCapture() {
			document.removeEventListener("mouseup", stopCapture);
			document.removeEventListener("mousemove", continueCapture);
		}

		function continueCapture(ev) {
			updateHeight(`${startPosition - ev.clientY}px`);
		}

		document.addEventListener("mouseup", stopCapture);
		document.addEventListener("mousemove", continueCapture);
	}

	resizer!.addEventListener("mousedown", startCapture);
	return () => resizer!.removeEventListener("mousedown", startCapture);
}

function Resizer({ getRoot }: { getRoot: () => HTMLDivElement }) {
	const resizer = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		return makeResizable(getRoot(), resizer.current);
	}, []);

	return <div ref={resizer} className="resizer"></div>;
}

function createHostContainer(id: string, style?: any, className?: string) {
	let maybeNode = document.getElementById(id);
	if (maybeNode) {
		return maybeNode;
	}
	let node = document.createElement("div");
	node.setAttribute("id", id);
	if (className) {
		node.setAttribute("class", className);
	}
	if (style) {
		Object.assign(node.style, style);
	}
	document.body.appendChild(node);
	return node;
}
