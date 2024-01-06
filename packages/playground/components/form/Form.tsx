import * as React from "react";

interface ItemProps extends React.ComponentProps<"div"> {
  label: string;
}

function Item(props: ItemProps) {
  const { children, label, ...rest } = props;

  return (
    <div {...rest}>
      <label className="mb-2 block overflow-hidden text-ellipsis whitespace-nowrap bg-neutral text-foreground-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

export interface FormProps extends React.ComponentProps<"form"> {}

const FormRoot = React.forwardRef<HTMLFormElement, FormProps>((props, ref) => {
  const { children, ...rest } = props;

  return (
    <form ref={ref} {...rest}>
      {children}
    </form>
  );
});
FormRoot.displayName = "Form";

type FormRootType = typeof FormRoot;
type CompoundedComponent = FormRootType & {
  Item: typeof Item;
};

const Form = Item as CompoundedComponent;

Form.Item = Item;

export default Form;
