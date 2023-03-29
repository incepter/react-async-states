import {useParams} from "react-router-dom";
import {use} from "react-async-states/src";
import {API} from "../../api";

function User(props) {
	let {id: userId} = useParams()
	let data = use(
		"user-details",
		() => API.get(`/users/${userId}`),
		[userId]
	)

	return <details><pre>{JSON.stringify(data, null, 4)}</pre></details>;
}

export default User;
