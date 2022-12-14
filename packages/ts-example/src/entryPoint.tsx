import {
	createBrowserRouter,
	createRoutesFromElements,
	RouterProvider,
} from "react-router-dom";
import AppRoutes from "./routes/appRoutes";
import "antd/dist/antd.css";
import {useAsyncState} from "react-async-states";

const appRouter = createBrowserRouter(createRoutesFromElements(AppRoutes));

function EntryPoint() {
	let {state} = useAsyncState<number>('');
	return <RouterProvider router={appRouter} />;
}

export default EntryPoint;
