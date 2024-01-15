import * as React from "react";

import { ExternalLinkIcon } from "@radix-ui/react-icons";

interface ItemProps extends React.ComponentProps<"div"> {
  label: string;
  link?: string;
}

function Item(props: ItemProps) {
  const { children, label, link, ...rest } = props;

  return (
    <div {...rest}>
      <label className="mb-2 flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap bg-neutral text-foreground-secondary">
        <span
          title={label}
          className="overflow-hidden text-ellipsis whitespace-nowrap"
        >
          {label}
        </span>
        {link && (
          <a
            className="text-primary hover:text-primary-light active:text-primary-dark"
            href={link}
            target="_blank"
          >
            <ExternalLinkIcon />
          </a>
        )}
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
