import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Caminho absoluto de proposito: como este projeto fica aninhado dentro
    // de outra pasta que tambem tem .git e package-lock.json, o Vite as vezes
    // detecta a pasta de fora como raiz do workspace e resolve um caminho
    // relativo errado para o setupFiles. Um caminho absoluto evita o problema.
    setupFiles: [path.resolve(__dirname, "./src/test/setup.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
