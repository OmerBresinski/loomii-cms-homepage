import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { prettyJSON } from "hono/pretty-json";
import { clerkMiddleware } from "@hono/clerk-auth";
import { HTTPException } from "hono/http-exception";

import { authRoutes } from "./routes/auth";
import { organizationRoutes } from "./routes/organizations";
import { githubRoutes } from "./routes/github";
import { projectRoutes } from "./routes/projects";
import { elementRoutes } from "./routes/elements";
import { sectionRoutes } from "./routes/sections";
import { editRoutes } from "./routes/edits";
import { analysisRoutes } from "./routes/analysis";
import { teamRoutes } from "./routes/team";
import { healthRoutes } from "./routes/health";

// Create the main Hono app
const app = new Hono();

// Global error handler
app.onError((err, c) => {
  console.error("API Error:", err);
  
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  
  return c.json({ error: "Internal server error" }, 500);
});

// Global middleware
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", prettyJSON());

// CORS configuration for frontend
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Clerk authentication middleware
app.use("*", clerkMiddleware());

// Mount routes
const routes = app
  .route("/health", healthRoutes)
  .route("/auth", authRoutes)
  .route("/organizations", organizationRoutes)
  .route("/github", githubRoutes)
  .route("/projects", projectRoutes)
  .route("/projects/:projectId/elements", elementRoutes)
  .route("/projects/:projectId/sections", sectionRoutes)
  .route("/projects/:projectId/edits", editRoutes)
  .route("/projects/:projectId/analysis", analysisRoutes)
  .route("/projects/:projectId/team", teamRoutes);

// Export type for RPC client
export type AppType = typeof routes;
export { app };

