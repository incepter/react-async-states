import { Route } from "react-router-dom";
import PublicLayout from "../ui/layouts/publicLayout";
import User from "../ui/pages/user";
import ROUTES from "./routes";

const AppRoutes = (
	<Route path={ROUTES.DEFAULT} element={<PublicLayout />}>
		<Route index element={<User />} />
	</Route>
);

export default AppRoutes;
