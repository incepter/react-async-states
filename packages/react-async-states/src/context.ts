import * as React from "react";
import {AsyncStateContextValue} from "./types";

export const AsyncStateContext = React.createContext<AsyncStateContextValue | null>(
  null);
