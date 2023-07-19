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
		<React.Suspense fallback="Top level suspense">
			<App />
		</React.Suspense>
	</React.StrictMode>
);

export const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20];

function SuspenseBoundary(props) {
	let color = props.color || "white";
	return (
		<section style={{ padding: 16, border: `1px dashed ${color}` }}>
			<summary style={{ marginBottom: 16 }}>
				This is a suspense boundary
			</summary>
			<Suspense fallback={props.fallback}>{props.children}</Suspense>
		</section>
	);
}

function Section({ open, children, summary }) {
	return (
		<details open>
			<summary>{summary}</summary>
			{children}
		</details>
	);
}

function App() {
	const [userId, setId] = React.useState(1);
	console.log("App", userId);

	return (
		<div>
			<Buttons setId={setId} />
			<SuspenseBoundary fallback="boundary 1 fallback" color="red">
				<UserDetails alias="1" useHook={useAsync} userId={userId} />
				<UserDetails alias="2" useHook={useFiber} userId={userId} />
			</SuspenseBoundary>
			<hr />
			<UserDetails alias="3" useHook={useFiber} userId={userId} />
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
	// React.useLayoutEffect(() => {
	// 	console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&layouteffect", alias);
	// });
	// if (paintedId === userId) {
	// 	throw new Error("STOP");
	// }
	const result = useHook({
		key: "user",
		lazy: false,
		args: [userId],
		initialValue: {},
		producer: getUsersDetails,
	});

	console.log("render for", alias, "completed");
	const { data } = result;
	if (result.isPending) {
		return `Pending for props (${userId}), and optimistic args (${result.state.props.args[0]})`;
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
