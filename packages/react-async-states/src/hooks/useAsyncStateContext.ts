import * as React from "react";
import {AsyncStateContext} from "../context";
import {AsyncStateContextValue} from "../types.internal";

export default function useAsyncStateContext(): AsyncStateContextValue {
  const contextValue = React.useContext(AsyncStateContext);
  if (!contextValue) {
    throw new Error(
      "to use useSelector you must be inside a <AsyncStateProvider/>");
  }
  return contextValue;
}
