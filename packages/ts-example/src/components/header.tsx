import {ProducerProps, useAsyncState} from "react-async-states"



function fetchUser(props: ProducerProps<any>) {
	if (!props.payload.userId) {
		// props.abort!();
		throw new Error('User id is required!')
	}
	let controller = new AbortController();
	props.onAbort(() => controller.abort());

	let id = setTimeout(() => {
		console.log('I AM A TIMEOUTTTTT');
		props.abort!("api t3tlat");}, 20);
	props.onAbort(() => clearTimeout(id));

	return fetch(`https://jsonplaceholder.typicode.com/users/${props.payload.userId}`,
		{signal: controller.signal}
	)
		.then(res => {
			if (res.status > 300 || res.status < 200) {
				throw new Error(`${res.status}`);
			}
			return res.json();
		});
}

function Header() {
	// let {read, run} = useAsyncState();

	// let state = read();
	//
	// state.status;

	return (
		<div className="pt-4 flex items-center justify-start">
			<button onClick={()=> {




				//
				//
				//
				// let abort = runc({
				// 	payload: {
				// 		// userId: 5,
				// 	},
				// 	producer:fetchUser,
				// 	onSuccess(s) {
				// 		console.log('user details', s.data)
				// 	},
				// 	onFulfillment(s) {
				// 		console.log('resolved state', s)
				// 	}
				// });
				// abort("fi khatr lkhwatr")
			}}>HAHAHAAAA</button>
			<span className="font-bold text-2xl text-white">ASYNC STATE DEMO</span>
		</div>
	);
}

export default Header;
