import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8080,
    open: true,
    allowedHosts: [
      "b871-2600-4808-5392-d600-f56e-35f9-2ff6-6eb.ngrok-free.app",
    ],
  },
});
