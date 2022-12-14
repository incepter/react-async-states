import * as React from "react";
import {StateContextValue} from "../types.internal";

export const StateContext =
  React.createContext<StateContextValue | null>(null);
