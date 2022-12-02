import * as React from "react";
import ReactJson from "react-json-view";

export default function Json({name, src, level = 2}) {
  return (
    <ReactJson
      name={name}
      style={{
        backgroundColor: "#252b36",
        borderRadius: 8,
        padding: "1rem",
      }}
      theme="solarized"
      collapsed={level}
      displayDataTypes={false}
      displayObjectSize={false}
      enableClipboard={false}
      src={src}
    />
  );
}
