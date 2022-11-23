import React from "react";
import ReactDOM from "react-dom";
import Button from "antd/es/button";
import ReactDOMClient from "react-dom/client";
import {DevtoolsView} from "./DevtoolsView";
import './index.css';

export function DevtoolsViewLib() {
  return <DevtoolsView/>;
}

export function AutoConfiguredDevtools() {
  return ReactDOM.createPortal(
    <AutoConfiguredDevtoolsImpl allowResize wrapperStyle={{
      top: '50vh',
      width: '100%',
      height: '50vh',
      position: "absolute"
    }}/>,
    createHostContainer("async-states-devtools"),
  )
}

export function autoConfigureDevtools(props?: { open?: boolean }) {
  let hostContainer = createHostContainer("async-states-devtools", {
    top: '50vh',
    width: '100%',
    height: '50vh',
    position: "absolute"
  }, 'auto-devtools');

  ReactDomRender(hostContainer, <AutoConfiguredDevtoolsImpl allowResize
                                                            initiallyOpen={props?.open}
                                                            wrapperStyle={{
                                                              width: '100%',
                                                              height: '100%',
                                                            }}/>)
}

function ReactDomRender(hostRoot, element) {
  if (ReactDOMClient && typeof ReactDOMClient.createRoot === "function") {
    const root = ReactDOMClient.createRoot(hostRoot);
    root.render(element);
  } else {
    ReactDOM.render(element, hostRoot);
  }
}

function AutoConfiguredDevtoolsImpl({
  wrapperStyle,
  initiallyOpen = false,
  allowResize = false
}) {
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
        {allowResize && <Resizer/>}
        <DevtoolsView onClose={() => setVisible(false)}/>
      </div>)}
    </>
  );
}

function makeResizable(
  target: HTMLElement | null | undefined,
  resizer: HTMLElement | null | undefined,
) {
  function startCapture(e) {
    if (!target || !resizer) {
      return;
    }

    let startPosition = e.clientY;
    let top = target.style.top;
    let height = target.style.height;

    function updateHeight(delta: string) {
      target!.style.top = `calc(${top} - ${delta})`;
      target!.style.height = `calc(${height} + ${delta})`;
    }

    function stopCapture() {
      document.removeEventListener('mouseup', stopCapture);
      document.removeEventListener('mousemove', continueCapture);
    }
    function continueCapture(ev) {
      updateHeight(`${startPosition - ev.clientY}px`);
    }

    document.addEventListener('mouseup', stopCapture);
    document.addEventListener('mousemove', continueCapture);
  }

  resizer!.addEventListener("mousedown", startCapture);
  return () => resizer!.removeEventListener("mousedown", startCapture);
}

function Resizer() {
  const resizer = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    return makeResizable(
      document.getElementById("async-states-devtools"),
      resizer.current
    );
  }, []);

  return (
    <div ref={resizer} className="resizer"></div>
  );
}

function createHostContainer(id: string, style?: any, className?: string) {
  let maybeNode = document.getElementById(id);
  if (maybeNode) {
    return maybeNode;
  }
  let node = document.createElement("div");
  node.setAttribute("id", id);
  if (className) {
    node.setAttribute("class", className);
  }
  if (style) {
    Object.assign(node.style, style);
  }
  document.body.appendChild(node);
  return node;
}
