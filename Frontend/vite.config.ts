import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8080,
    open: true,
    allowedHosts: [
      "d283-2600-4808-5392-d600-c169-c8bd-9682-5e51.ngrok-free.app",
    ],
  },
});
