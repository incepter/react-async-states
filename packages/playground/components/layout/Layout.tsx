import clsx from "clsx";

export interface LayoutProps extends React.ComponentProps<"div"> {}

function Layout(props: LayoutProps) {
  const { className, children, ...rest } = props;

  return (
    <div className={clsx(className, "relative flex")} {...rest}>
      {children}
    </div>
  );
}

export default Layout;
