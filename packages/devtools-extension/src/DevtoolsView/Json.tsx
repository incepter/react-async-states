import * as React from "react";
import ReactJson from "react-json-view";

export default React.memo<{ name: string, src: any, level?: number }>(function Json({
  name,
  src,
  level = 2
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
})
