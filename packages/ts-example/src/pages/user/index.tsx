import {useLoaderData} from "react-router-dom";
import {Sources} from "async-states";
import {useAsyncState} from "react-async-states";

function User() {

	let {state} = useAsyncState("user");

	console.log('loader data');
	return <h3 onClick={() => Sources.of("user").replay()}>ASYNC STATE FETCH USER DETAILS !</h3>;
}

export default User;
