import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Config isolada para testes: evita os plugins do TanStack Start/Nitro
// (que são para build/SSR) e usa apenas a resolução do alias "@/".
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
