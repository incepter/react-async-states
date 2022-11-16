import * as React from "react";
import Layout from "antd/lib/layout";
import {useAsyncState,} from "react-async-states";
import {gatewaySource} from "./sources";
import CurrentStateDisplay from "./CurrentStateDisplay";
import SiderDisplay from "./SiderDisplay";

export function DevtoolsView({useDevMode}: { useDevMode?: boolean }) {
  useAsyncState.auto({
    source: gatewaySource,
    payload: {dev: useDevMode ?? true}
  }, [useDevMode]);

  return (
    <Layout className='main-bg scroll-y-auto'
            style={{height: '100vh', overflow: "auto"}}>
      <SiderDisplay/>
      <Layout.Content
        style={{
          height: '100vh',
          overflow: 'auto',
        }}
        className="scroll-y-auto"
      >
        <CurrentStateDisplay/>
      </Layout.Content>
    </Layout>
  );
}
