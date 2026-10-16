/** Configure Vite, React transformation, and the jsdom unit-test environment. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: "./tests/setup.js",
    restoreMocks: true,
  },
});
