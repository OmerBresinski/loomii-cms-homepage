import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { prisma, validateSession } from "@ai-cms/db";
import type { User, Session } from "@prisma/client";

// Extend Hono context with user info
declare module "hono" {
  interface ContextVariableMap {
    user: User;
    session: Session;
  }
}

// Cookie name for session token
const SESSION_COOKIE = "ai_cms_session";

// Auth middleware - requires authentication
export const requireAuth = createMiddleware(async (c, next) => {
  // Get token from cookie or Authorization header
  const cookieToken = c.req.raw.headers.get("cookie")?.match(/ai_cms_session=([^;]+)/)?.[1];
  const headerToken = c.req.header("Authorization")?.replace("Bearer ", "");
  const token = cookieToken || headerToken;

  if (!token) {
    throw new HTTPException(401, { message: "Authentication required" });
  }

  const session = await validateSession(token);

  if (!session) {
    throw new HTTPException(401, { message: "Invalid or expired session" });
  }

  // Set user and session in context
  c.set("user", session.user);
  c.set("session", session);

  await next();
});

// Optional auth - attaches user if authenticated, but doesn't require it
export const optionalAuth = createMiddleware(async (c, next) => {
  const cookieToken = c.req.raw.headers.get("cookie")?.match(/ai_cms_session=([^;]+)/)?.[1];
  const headerToken = c.req.header("Authorization")?.replace("Bearer ", "");
  const token = cookieToken || headerToken;

  if (token) {
    const session = await validateSession(token);
    if (session) {
      c.set("user", session.user);
      c.set("session", session);
    }
  }

  await next();
});

// Helper to set session cookie
export function setSessionCookie(token: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production";
  const sameSite = secure ? "None" : "Lax";
  
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=${sameSite}${secure ? "; Secure" : ""}; Max-Age=${maxAgeSeconds}`;
}

// Helper to clear session cookie
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0`;
}

// Project access middleware
export const requireProjectAccess = (requiredRole?: "owner" | "admin" | "editor" | "viewer") =>
  createMiddleware(async (c, next) => {
    const user = c.get("user");
    const projectId = c.req.param("projectId");

    if (!projectId) {
      throw new HTTPException(400, { message: "Project ID required" });
    }

    // Check project access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        teamMembers: {
          where: { userId: user.id },
        },
      },
    });

    if (!project) {
      throw new HTTPException(404, { message: "Project not found" });
    }

    // Owner always has full access
    if (project.userId === user.id) {
      await next();
      return;
    }

    // Check team membership
    const membership = project.teamMembers[0];
    if (!membership) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    // Check role hierarchy if required
    if (requiredRole) {
      const roleHierarchy = ["viewer", "editor", "admin", "owner"];
      const userRoleIndex = roleHierarchy.indexOf(membership.role);
      const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

      if (userRoleIndex < requiredRoleIndex) {
        throw new HTTPException(403, { message: "Insufficient permissions" });
      }
    }

    await next();
  });

