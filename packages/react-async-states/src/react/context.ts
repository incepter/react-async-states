import * as React from "react";
import {AsyncStateContextValue} from "../types.internal";

export const AsyncStateContext =
  React.createContext<AsyncStateContextValue | null>(null);
