import * as React from "react";
const ReactJson = require('react-json-view').default;

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
      name={name}
      theme="solarized"
      collapsed={level}
      displayDataTypes={false}
      displayObjectSize={false}
      enableClipboard={false}
      src={src}
    />
  );
}

export default JsonView;
