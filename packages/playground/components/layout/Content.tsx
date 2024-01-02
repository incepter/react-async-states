import clsx from "clsx";

export interface ContentProps extends React.ComponentProps<"main"> {}

export default function Content(props: ContentProps) {
  const { className, children, ...rest } = props;

  return (
    <main className={clsx(className, "flex-1")} {...rest}>
      {children}
    </main>
  );
}
