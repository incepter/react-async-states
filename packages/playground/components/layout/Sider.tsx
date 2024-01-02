import clsx from "clsx";

export interface SiderProps extends React.ComponentProps<"aside"> {}

export default function Sider(props: SiderProps) {
  const { className, children, ...rest } = props;

  return (
    <aside
      className={clsx(className, "sticky top-0 h-svh overflow-y-auto")}
      {...rest}
    >
      {children}
    </aside>
  );
}
