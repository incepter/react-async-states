import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router-dom";
import AppRoutes from "./routes/appRoutes";
import "antd/dist/antd.css";


function EntryPoint() {
  return <RouterProvider router={appRouter}/>;
}
const appRouter = createBrowserRouter(createRoutesFromElements(AppRoutes));

export default EntryPoint;
