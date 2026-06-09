import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "mf_users",
      filename: "remoteEntry.js",
      exposes: { "./UsersApp": "./src/UsersApp.jsx" },
      shared: ["react", "react-dom"]
    })
  ],
  build: { target: "esnext" },
  server: { port: 5174 }
});
