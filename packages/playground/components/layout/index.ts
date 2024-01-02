import InternalLayout from "./Layout";
import Content from "./Content";
import Sider from "./Sider";

export type { LayoutProps } from "./Layout";
export type { ContentProps } from "./Content";
export type { SiderProps } from "./Sider";

type InternalLayoutType = typeof InternalLayout;

type CompoundedComponent = InternalLayoutType & {
  Content: typeof Content;
  Sider: typeof Sider;
};

const Layout = InternalLayout as CompoundedComponent;

Layout.Content = Content;
Layout.Sider = Sider;

export default Layout;
