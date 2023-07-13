import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import DefaultErrorBoundary from "./app/error-boundary";
import V2 from "./v2";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<DefaultErrorBoundary>
			<V2 />
			{/*<V2 />*/}
		</DefaultErrorBoundary>
	</React.StrictMode>
);
