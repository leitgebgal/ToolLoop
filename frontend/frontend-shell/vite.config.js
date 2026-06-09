import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "frontend_shell",
      remotes: {
        mf_users: "http://localhost:5174/assets/remoteEntry.js",
        mf_items: "http://localhost:5175/assets/remoteEntry.js",
        mf_rentals: "http://localhost:5176/assets/remoteEntry.js"
      },
      shared: ["react", "react-dom"]
    })
  ],
  build: { target: "esnext" },
  server: { port: 5173 }
});
