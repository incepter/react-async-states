import { Layout, Menu } from "antd";
import { Outlet, NavLink } from "react-router-dom";
import CustomHeader from "../components/header";

import { ReactNode } from "react";
import ROUTES from "../routes/routes";

export interface MenuItem {
	key: string;
	label: ReactNode;
	icon: string;
	children?: MenuItem[];
}

export const menuItems: MenuItem[] = [
	{
		key: "users",
		label: <NavLink to={ROUTES.USERS}>Users</NavLink>,
		icon: "",
		children: [
			{
				key: "userDetails",
				label: <NavLink to={ROUTES.USER}>User details</NavLink>,
				icon: "",
			},
		],
	},
];

const { Header, Content, Sider } = Layout;

const PublicLayout = () => {
	return (
		<Layout>
			<Header>
				<CustomHeader />
			</Header>
			<Layout>
				<Sider>
					<Menu mode="inline" items={menuItems} theme="dark" />
				</Sider>
				<Content>
					<Outlet />
				</Content>
			</Layout>
		</Layout>
	);
};

export default PublicLayout;
