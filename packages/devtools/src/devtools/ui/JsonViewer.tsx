import * as React from "react";
import ReactJson from "react-json-view";

const JsonView = React.memo(JsonViewer);

export function JsonViewer({
  name,
  src,
  level = 2,
}: {
  name: string;
  src: any;
  level?: number;
}) {
  return (
    <ReactJson
      src={src}
      name={name}
      theme="solarized"
      collapsed={level}
      enableClipboard={false}
      displayDataTypes={false}
      displayObjectSize={false}
    />
  );
}

export default JsonView;
