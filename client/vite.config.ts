import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo, /api se redirige a la API local para evitar problemas de CORS.
    proxy: { "/api": "http://localhost:3001" }
  }
});
