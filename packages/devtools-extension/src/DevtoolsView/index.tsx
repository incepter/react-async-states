import * as React from "react";
import Layout from "antd/lib/layout";
import Button from "antd/es/button";
import {useAsyncState,} from "react-async-states";

import {gatewaySource} from "./sources";
import CurrentStateDisplay from "./CurrentStateDisplay";
import SiderDisplay from "./SiderDisplay";
import {DevtoolsProvider} from "./context";

export function DevtoolsView({
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
              overflow: 'auto',
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
