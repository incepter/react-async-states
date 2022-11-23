import * as React from "react";
import Layout from "antd/es/layout";
import Button from "antd/es/button";
import ReactDOM from "react-dom";
import ReactDOMClient from "react-dom/client";
import {useAsyncState,} from "react-async-states";

import {gatewaySource} from "./sources";
import CurrentStateDisplay from "./CurrentStateDisplay";
import SiderDisplay from "./SiderDisplay";
import {DevtoolsProvider} from "./context";
import {__DEV__} from "../utils";

import '../index.css';

function DevtoolsViewInternal({
  useDevMode,
  onClose
}: { useDevMode?: boolean, onClose?: Function }) {

  useAsyncState.auto({
    source: gatewaySource,
    payload: {dev: useDevMode ?? true}
  }, [useDevMode]);

  return (
    <DevtoolsProvider dev={useDevMode}>
      <Layout className='main-bg scroll-y-auto devtools-root-animated'
              style={{height: '100%', overflow: "auto"}}>
        {onClose && (
          <Button style={{
            zIndex: 9,
            top: "16px",
            right: "16px",
            position: "absolute",
          }} onClick={() => onClose()} size="large"
                  shape="circle">
            X
          </Button>
        )}
        <Layout className='main-bg scroll-y-auto'
                style={{height: '100%', overflow: "auto"}}>
          <SiderDisplay/>
          <Layout.Content
            style={{
              height: '100%',
            }}
            className="scroll-y-auto"
          >
            <CurrentStateDisplay/>
          </Layout.Content>
        </Layout>

      </Layout>
    </DevtoolsProvider>
  );
}

export function DevtoolsView() {
  if (!__DEV__) {
    return null;
  }
  return <DevtoolsView/>;
}

export function AutoConfiguredDevtools() {
  if (!__DEV__) {
    return null;
  }
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
  if (!__DEV__) {
    return null;
  }
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
        <DevtoolsViewInternal onClose={() => setVisible(false)}/>
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
