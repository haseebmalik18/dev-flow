import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8080,
    open: true,
    allowedHosts: [
      "d8f0-2600-4808-5392-d600-88bc-3f9a-3ae0-758a.ngrok-free.app",
    ],
  },
});
