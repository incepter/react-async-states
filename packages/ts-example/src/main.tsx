import React from "react";
import ReactDOM from "react-dom/client";
import EntryPoint from "./ui/pages/entryPoint";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<EntryPoint />
	</React.StrictMode>
);
