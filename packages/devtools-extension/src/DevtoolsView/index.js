import React from "react";
import Layout from "antd/lib/layout";
import { useAsyncState, useSource, } from "react-async-states";
import { currentState, gatewaySource, keysSource } from "./sources";
import CurrentStateDisplay, { SideKey } from "./CurrentStateDisplay";

const {Header, Content, Sider} = Layout;

export function DevtoolsView() {
  useAsyncState.auto(gatewaySource);
  const {state: {data}} = useSource(keysSource);
  const {state: {data: lane}} = useSource(currentState);

  const entries = Object.entries(data);

  return (
    <Layout style={{height: '100vh'}}>
      <Header style={{height: 32}} className="header">
        <div className="logo"/>
      </Header>
      <Layout>
        <Sider width={300} className="site-layout-background">
          <div style={{display: "flex", flexDirection: "column"}}>
            {entries.map(([uniqueId, key]) => <SideKey key={uniqueId}
                                                       uniqueId={uniqueId}
                                                       asyncStateKey={key}
                                                       isCurrent={uniqueId === lane}
            />)}
          </div>
        </Sider>
        <Layout>
          <Content
            style={{padding: 32}}
            className="site-layout-background"
          >
            <CurrentStateDisplay/>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
