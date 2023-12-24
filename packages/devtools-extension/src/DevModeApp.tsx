import * as React from "react";
import { createSource, useAsync } from "react-async-states";
import { ProducerProps } from "async-states";

let src = createSource<number>("test-2", null, { initialValue: 0 });
let src2 = createSource<number>("test-1", null, { initialValue: 0 })
	.getLane("test-1-lane")
	.getLane("test-1-lane-lane-nested");

// @ts-ignore
src.setState(new Error(""), "error");
src2.setState(null, "pending");

let meter = 0;

let source = createSource<number, [number], any>("devmodeapp", null, {
	initialValue: 0,
});

// createSource("toto-1");
// createSource("toto-10");
// createSource("toto-100");
// createSource("toto-1000");
// createSource("toto-10000");
// createSource("toto-100000");
// createSource("toto-1900000");
// createSource("toto-1222222");
// createSource("toto-12222222");
createSource("toto-333333333");
createSource("toto-1444444444", null, {
	initialValue: {
		a: {
			very: {
				long: {
					object: {
						to: {
							test: {
								scrolling: {
									overflow: {
										auto: {
											on: {
												y: {
													axis: true,
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	},
});

function DevModeApp({ alias }) {
	const { state } = useAsync({
		source,
		lazy: false,
		autoRunArgs: [++meter],
		condition: (actualState) => actualState.status === "initial",
	});
	return (
		<button onClick={() => source.setState((old) => old.data + 1)}>
			{alias} - {state.data}
		</button>
	);
}

function intevalProducer(props) {
	let id = setInterval(() => {
		let current = props.getState();
		if (current.data === 3) {
			props.emit(new Error("Error artificial"), "error");
		} else {
			props.emit((old) => {
				return (Number(old.data) || 0) + 1;
			});
		}
	}, props.payload.delay);
	props.onAbort(() => clearInterval(id));

	return props.lastSuccess.data;
}

function Interval({ alias, delay }) {
	const source = React.useMemo(
		() =>
			createSource<number, [number], any>(alias, intevalProducer, {
				initialValue: 0,
			}),
		[]
	);
	const { state } = useAsync.auto({ source, payload: { delay } }, [delay]);
	return (
		<button onClick={() => source.setState((old) => old.data + 1)}>
			Interval {alias} - {String(state.data)}
		</button>
	);
}

export default function DevModeAppExp() {
	return (
		<>
			<DevModeApp alias="devmodeapp" />
			<hr />
			<DevModeApp alias="random" />
			<hr />
			<Interval alias="interval-demo" delay={1000} />
			<hr />
			<Conditional />
			<hr />
			<UserDetails />
		</>
	);
}

type User = {
	id: number;
	email: string;
	name: string;
};

async function fetchUsers({ signal }: ProducerProps<User[]>) {
	// artificially delayed by 500ms
	await new Promise((res) => setTimeout(res, 1000));
	return await fetch("https://jsonplaceholder.typicode.com/users", {
		signal,
	}).then((res) => res.json());
}

function UserDetails() {
	const { data, isPending, source } = useAsync.auto({
		key: "users-list",
		producer: fetchUsers,
		cacheConfig: {
			auto: true,
			timeout: 5000,
			enabled: true,
			hash: () => "list",
		},
	});

	return (
		<div className="App">
			<button disabled={isPending} onClick={() => source.run()}>
				Fetch users {isPending && "..."}
			</button>
			{data && (
				<ul>
					<summary>Users list:</summary>
					{data.map((user: User) => (
						<li key={user.id}>{user.name}</li>
					))}
				</ul>
			)}
		</div>
	);
}

function Conditional() {
	let [visible, setVisible] = React.useState(false);

	return (
		<>
			<button onClick={() => setVisible((prev) => !prev)}>Toggle</button>
			{visible && <Standalone />}
		</>
	);
}

function standaloneInterval(props) {
	let id = setInterval(() => {
		props.emit((old) => {
			return old.data + 1;
		});
	}, props.payload.delay);
	props.onAbort(() => clearInterval(id));

	return props.lastSuccess.data;
}

function Standalone() {
	let { data } = useAsync.auto({
		initialValue: 0,
		payload: { delay: 3000 },
		producer: standaloneInterval,
	});

	return <span>data: {String(data)}</span>;
}
