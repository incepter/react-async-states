import { api, createApplication, ProducerProps } from "react-async-states";
import { UserType } from "./users/types";
import { PostType } from "./posts/types";
import { API } from "./api";

let goodUxConfig = {
	skipPendingDelayMs: 300,
	keepPendingForMs: 300,
};
let myApp = {
	posts: {
		search: api<PostType[], [string]>(),
	},
	users: {
		search: api<UserType[], [string]>(),
		findById: api<UserType, [string]>(),
		deleteUser: api<boolean, [string]>(),
		editUser: api<UserType, [UserType]>(),
		addNewPost: api<PostType, [PostType]>(),
		findUserPosts: api<UserType, [string]>(),
	},
	auth: {
		login: api<string, [string, string]>({
			eager: true,
			config: goodUxConfig,
			producer: loginProducer,
		}),
		current: api<UserType, []>({
			eager: true,
			producer: currentUserProducer,
			config: {
				...goodUxConfig,
				cacheConfig: {
					enabled: true,
					hash: () => localStorage.getItem("__principal_id__v1.0") as string,
				},
			},
		}),
	},
};

export let app = createApplication<typeof myApp>(myApp);

// Static producers
async function loginProducer(props: ProducerProps<string, [string, string]>) {
	let [userId] = props.args;
	if (!+userId) {
		throw new Error(`UserId ${userId} is not a number between 1 and 10`);
	}
	console.log("boom with", userId);
	localStorage.setItem("__principal_id__v1.0", userId);
	await app.auth.current().runp();
	return userId;
}

async function currentUserProducer(props: ProducerProps<UserType, []>) {
	let signal = props.signal;
	let currentUserId = localStorage.getItem("__principal_id__v1.0");
	if (!currentUserId) {
		throw new Error("No saved user");
	}

	let userDetails = await API.get<UserType>(`/users/${currentUserId}`, {
		signal,
	});
	return userDetails.data;
}

export function logout() {
	localStorage.removeItem("__principal_id__v1.0");
	app.auth.current().invalidateCache();
	app.auth.current().run();
}
