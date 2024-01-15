import * as React from "react";
import ReactJson from "react-json-view";

const JsonView = React.memo(Json);

export function Json({
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
