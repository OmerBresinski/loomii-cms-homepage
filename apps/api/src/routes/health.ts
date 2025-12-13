import { Hono } from "hono";

export const healthRoutes = new Hono()
  .get("/", (c) => {
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.0.1",
    });
  })
  .get("/ready", async (c) => {
    // Add database connectivity check here once DB is set up
    const checks = {
      database: true, // TODO: Actual DB health check
      timestamp: new Date().toISOString(),
    };

    const isHealthy = Object.values(checks).every(
      (v) => v === true || typeof v === "string"
    );

    return c.json(
      {
        status: isHealthy ? "ready" : "degraded",
        checks,
      },
      isHealthy ? 200 : 503
    );
  });

