import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8080,
    open: true,
    allowedHosts: [
      "37b1-2600-4808-5392-d600-d839-6751-9fae-584b.ngrok-free.app",
    ],
  },
});
