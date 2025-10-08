import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Buffer } from "buffer";
import { WagmiProvider } from "wagmi";
import { config } from "./wagmi.ts";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

globalThis.Buffer = Buffer;

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <RouterProvider router={router} />
          {process.env.NODE_ENV !== 'production' && (
            <TanStackRouterDevtools router={router} />
          )}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
