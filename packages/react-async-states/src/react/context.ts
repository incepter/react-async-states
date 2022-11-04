import * as React from "react";
import {StateContextValue} from "../types.internal";

export const AsyncStateContext =
  React.createContext<StateContextValue | null>(null);
