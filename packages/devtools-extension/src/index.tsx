import React from "react";
import ReactDOM from "react-dom";
import Button from "antd/es/button";
import ReactDOMClient from "react-dom/client";
import {DevtoolsView} from "./DevtoolsView";
import './index.css';

export default function DevtoolsViewLib() {
  return <DevtoolsView/>;
}

export function AutoConfiguredDevtools() {
  return ReactDOM.createPortal(
    <AutoConfiguredDevtoolsImpl wrapperStyle={{
      top: '50vh',
      width: '100%',
      height: '50vh',
      position: "absolute"
    }}/>,
    createHostContainer("async-states-devtools"),
  )
}

let devtoolsRoot;

export function autoConfigureDevtools(props?: { open?: boolean }) {
  if (!devtoolsRoot) {
    devtoolsRoot = ReactDOMClient.createRoot(
      createHostContainer("async-states-devtools", {
        top: '50vh',
        width: '100%',
        height: '50vh',
        position: "absolute"
      })
    );
  }
  devtoolsRoot.render(<AutoConfiguredDevtoolsImpl initiallyOpen={props?.open}
                                                  wrapperStyle={{
                                                    width: '100%',
                                                    height: '100%',
                                                  }}/>);
}

function AutoConfiguredDevtoolsImpl({wrapperStyle, initiallyOpen = false}) {
  const [visible, setVisible] = React.useState(initiallyOpen);

  React.useEffect(() => {
    function listener(e) {
      if (e.key === "Escape") {
        setVisible(old => !old);
      }
    }

    window && window.addEventListener("keydown", listener);

    return () => window && window.removeEventListener("keydown", listener);
  }, []);

  return (
    <>
      {!visible && (
        <Button style={{
          zIndex: 99,
          right: "32px",
          bottom: "32px",
          position: "absolute",
        }} onClick={() => setVisible(old => !old)} type="primary" size="large"
                shape="circle">
          +
        </Button>
      )}
      {visible && (<div style={wrapperStyle}>
        <DevtoolsView onClose={() => setVisible(false)}/>
      </div>)}
    </>
  );
}

function createHostContainer(id: string, style?: any) {
  let maybeNode = document.getElementById(id);
  if (maybeNode) {
    return maybeNode;
  }
  let node = document.createElement("div");
  node.setAttribute("id", id);
  if (style) {
    Object.assign(node.style, style);
  }
  document.body.appendChild(node);
  return node;
}
