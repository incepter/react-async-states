import { Route, Navigate } from "react-router-dom";
import Welcome from "../components/welcome";
import PublicLayout from "../layouts/publicLayout";
import User from "../pages/user";
import UserList from "../pages/users";
import ROUTES from "./routes";

const AppRoutes = (
	<Route path={ROUTES.DEFAULT} element={<PublicLayout />}>
		<Route index element={<Welcome />} />
		<Route path={ROUTES.USERS}>
			<Route index element={<UserList />} />
			<Route path={ROUTES.USER} element={<User />} />
		</Route>
		<Route path={ROUTES.ANY} element={<Navigate to={ROUTES.USERS} replace />} />
	</Route>
);

export default AppRoutes;
