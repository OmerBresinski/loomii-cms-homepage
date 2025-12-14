import { app } from "./app";

const port = parseInt(process.env.PORT || "3010", 10);

console.log(`🚀 API server starting on port ${port}`);

// Bun's native HTTP server with Hono
const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`✅ API server running at http://localhost:${server.port}`);
