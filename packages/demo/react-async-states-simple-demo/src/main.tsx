// import React from "react";
// import ReactDOM from "react-dom/client";
// import "./index.css";
// import DefaultErrorBoundary from "./app/error-boundary";
// import V2 from "./v2";
//
// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
// 	<React.StrictMode>
// 		<React.Suspense fallback="Top level Suspense fallback">
// 			<DefaultErrorBoundary>
// 				<V2 />
// 				{/*<V2 />*/}
// 			</DefaultErrorBoundary>
// 		</React.Suspense>
// 	</React.StrictMode>
// );
import React, { Suspense, useTransition } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { API } from "./app/api";
import { useAsync, useData, useFiber } from "state-fiber/src";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement, {}).render(
	<React.StrictMode>
		<React.Suspense fallback="llkjlkljk">
			<App />
		</React.Suspense>
	</React.StrictMode>
);

export const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20];

let paintedId: number | null = null;
function App() {
	const [userId, setId] = React.useState(1);
	let setUserId = (id) => {
		console.log("_______spy");
		setId(id);
	};

	React.useEffect(() => {
		paintedId = userId;
	}, [userId]);
	console.log("App", userId);

	return (
		<div>
			<Suspense fallback="boundary 1">
				<UserDetails alias="1" useHook={useAsync} userId={userId} />
				<Buttons setId={setUserId} />
			</Suspense>
			<hr />
			<Suspense fallback="boundary 2">
				<UserDetails alias="2" useHook={useFiber} userId={userId} />
				<Buttons setId={setUserId} />
			</Suspense>
			<br />
			<hr />
		</div>
	);
}

function ErrorComponent({ error }) {
	return (
		<details open>
			<summary>Oops! Something bad happened</summary>
			<pre>{error.toString()}</pre>
		</details>
	);
}

function UserDetails(props) {
	let { userId, useHook, alias } = props;
	console.log(
		"render for user id___________________________",
		userId,
		alias,
		props
		// paintedId
	);
	React.useLayoutEffect(() => {
		console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&layouteffect", alias);
	});
	React.useEffect(() => {
		console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&effect", alias);
	});
	// if (paintedId === userId) {
	// 	throw new Error("STOP");
	// }
	const result = useHook({
		key: "user",
		lazy: false,
		args: [userId],
		producer: getUsersDetails,
	});
	console.log("render for", alias, "completed");
	const { data } = result;
	if (result.isPending) {
		console.log("_______________pending________________");
		return "Pending...";
	}
	return <UserDetailsImpl data={data} />;
}
function UserDetailsImpl({ data: user }) {
	return (
		<details>
			<summary>
				User {user.id} - {user.username} details
			</summary>
			<pre>{JSON.stringify(user, null, 4)}</pre>
		</details>
	);
}

let Buttons: React.FC<{ setId }> = React.memo(({ setId }) => {
	return (
		<div>
			{userIds.map((u) => (
				<SetUserButton key={u} id={u} setUserId={setId} />
			))}
		</div>
	);
});

export function SetUserButton({ id, setUserId }) {
	const [isPending, start] = useTransition();
	return (
		<button
			disabled={isPending}
			onClick={() => {
				// setUserId(id);
				start(() => setUserId(id));
			}}
			className={isPending ? "pending" : ""}
		>
			{id}
		</button>
	);
}

async function getUsersDetails(props): Promise<User> {
	let promise = await API.get(`/users/${props.args[0]}`);
	await new Promise((res) => setTimeout(res, 1000));
	return promise.data;
}
export function InvalidateButton({ id, api }: { id: number; api: any }) {
	const [isPending, start] = useTransition();
	return (
		<button
			disabled={isPending}
			onClick={() => {
				start(() => {
					api.evict(id);
				});
			}}
			className={isPending ? "pending" : ""}
		>
			{id}
		</button>
	);
}
export type Page<T> = {
	page: number;
	size: number;
	content: T[];
	totalPages: number;
};

export type User = {
	id: number;
	email: string;
	username: string;
};
export type Post = {
	id: number;
	title: string;
	userId: number;
};
