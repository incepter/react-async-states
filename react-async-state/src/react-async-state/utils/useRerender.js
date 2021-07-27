import React from "react";

export default function useRerender() {
  return React.useState()[1];
}
