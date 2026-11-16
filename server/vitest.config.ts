import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./test.db",
      JWT_SECRET: "scholaris-test-secret-key-that-is-long-enough-0123456789",
      JWT_EXPIRES_IN: "8h",
      CLIENT_ORIGIN: "http://localhost:5173",
      COOKIE_SECURE: "false",
      PORT: "4001",
    },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
