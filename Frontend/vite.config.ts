import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8080,
    open: true,
    allowedHosts: [
      "6c52-2600-4808-5392-d600-41ac-ed5b-37df-afb7.ngrok-free.app",
    ],
  },
});
