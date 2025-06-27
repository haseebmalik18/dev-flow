import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8080,
    open: true,
    allowedHosts: [
      "87c3-2600-4808-5392-d600-f9cf-a11a-39af-f208.ngrok-free.app",
    ],
  },
});
