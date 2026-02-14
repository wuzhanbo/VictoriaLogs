import * as path from "path";

import { defineConfig, ProxyOptions } from "vite";
import preact from "@preact/preset-vite";
import dynamicIndexHtmlPlugin from "./config/plugins/dynamicIndexHtml";

const getProxy = (): Record<string, ProxyOptions> | undefined => {
  const playground = process.env.PLAYGROUND;

  switch (playground) {
    case "LOGS": {
      return {
        "^(/select/.*|/flags)": {
          target: "https://play-vmlogs.victoriametrics.com",
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.removeHeader("AccountID");
              proxyReq.removeHeader("ProjectID");
            });

            proxy.on("error", (err) => {
              console.error("[proxy error]", err.message);
            });
          }
        }
      };
    }
    case "LOCAL": {
      return {
        "^/select/(?!vmui)": {
          target: "http://victorialogs:9428",
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.error("[proxy error]", err.message);
            });
          }
        },
        "^/flags": {
          target: "http://victorialogs:9428",
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.error("[proxy error]", err.message);
            });
          }
        }
      };
    }
    default: {
      return undefined;
    }
  }
};

export default defineConfig(({ mode }) => {
  return {
    base: "",
    plugins: [
      preact(),
      dynamicIndexHtmlPlugin({ mode })
    ],
    assetsInclude: ["**/*.md"],
    server: {
      open: false,
      port: 8080,
      host: "0.0.0.0",
      proxy: getProxy(),
      cors: true,
      allowedHosts: true,
    },
    resolve: {
      alias: {
        "src": path.resolve(__dirname, "src"),
      },
    },
    build: {
      outDir: "./build",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          }
        }
      }
    },
  };
});
