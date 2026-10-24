import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // One copy of React and react-hook-form shared with the linked `submitly` package.
    dedupe: ["react", "react-dom", "react-hook-form"],
  },
});
