import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";

import { Layout } from "@/components";

import { Providers } from "./providers";

import "@/styles/globals.css";

const { Content, Sider } = Layout;

const ubuntu = Ubuntu({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "React Async States - Playground",
  description: "Where you can play with react-async-states features",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={ubuntu.className}>
        <Providers>
          <Layout>
            <Content>{children}</Content>
            <Sider>This is the sidebar</Sider>
          </Layout>
        </Providers>
      </body>
    </html>
  );
}
