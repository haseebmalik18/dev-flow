import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8080,
    open: true,
    allowedHosts: [
      "0ede-2600-4808-5392-d600-6848-3d02-1ee9-1238.ngrok-free.app",
    ],
  },
});
