import {useLoaderData} from "react-router-dom";

function UserList() {

	let {data} = useLoaderData();

	console.log('loader data', data);

	return <h3>ASYNC STATE FETCH USERS HERE !</h3>;
}

export default UserList;
