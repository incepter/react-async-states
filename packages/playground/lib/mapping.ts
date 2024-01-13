import { Status } from "async-states";

export const getColorForStateStatus = (status: Status) => {
  switch (status) {
    case "pending":
      return "warning";
    case "initial":
      return "info";
    case "success":
      return "success";
    case "error":
      return "error";
    default:
      return null;
  }
};

export const getInputTypeForVariable = (variable: any): string => {
  switch (typeof variable) {
    case "string":
      return "text";
    case "number":
    case "bigint":
      return "number";
    case "boolean":
      return "checkbox";
    case "object":
      let isDate = variable.constructor.toString().indexOf("Date") > -1;
      if (isDate) {
        return "date";
      }
    default:
      return "text";
  }
};
