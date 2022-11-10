import {
	createBrowserRouter,
	createRoutesFromElements,
	RouterProvider,
} from "react-router-dom";
import AppRoutes from "../../routes/appRoutes";

const appRouter = createBrowserRouter(createRoutesFromElements(AppRoutes));

function EntryPoint() {
	return <RouterProvider router={appRouter} />;
}

export default EntryPoint;
