import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/header";

const PublicLayout = () => {
	return (
		<div className="flex flex-col">
			<Header />
			<Outlet />
		</div>
	);
};

export default PublicLayout;
