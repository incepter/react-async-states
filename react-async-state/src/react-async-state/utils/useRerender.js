import React from "react";
import { EMPTY_OBJECT } from "../../shared";

export default function useRerender() {
  return React.useState(EMPTY_OBJECT)[1];
}
