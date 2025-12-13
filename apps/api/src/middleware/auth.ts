import { createMiddleware } from "hono/factory";
import { getAuth } from "@hono/clerk-auth";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../db";

// User type stored in context
export type AuthUser = {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  githubAccessToken: string | null;
};

// Middleware to require authentication
export const requireAuth = createMiddleware(async (c, next) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  // Get or create user in database
  let user = await prisma.user.findUnique({
    where: { clerkId: auth.userId },
  });

  if (!user) {
    // User doesn't exist yet - they'll need to complete onboarding
    // For now, create a minimal user record
    user = await prisma.user.create({
      data: {
        clerkId: auth.userId,
        email: "", // Will be updated from Clerk webhook or profile sync
        name: null,
        avatarUrl: null,
      },
    });
  }

  // Add user to context
  c.set("user", {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    githubAccessToken: user.githubAccessToken,
  } as AuthUser);

  await next();
});

// Middleware to require project access
export const requireProjectAccess = (requiredRole?: "admin" | "owner") => {
  return createMiddleware(async (c, next) => {
    const user = c.get("user") as AuthUser;
    const projectId = c.req.param("projectId");

    if (!user || !projectId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

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

    const isOwner = project.userId === user.id;
    const teamMember = project.teamMembers[0];
    const isAdmin = teamMember?.role === "admin";

    // Check access based on required role
    if (requiredRole === "owner" && !isOwner) {
      throw new HTTPException(403, { message: "Owner access required" });
    }

    if (requiredRole === "admin" && !isOwner && !isAdmin) {
      throw new HTTPException(403, { message: "Admin access required" });
    }

    // Allow if user is owner or team member
    if (!isOwner && !teamMember) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    await next();
  });
};

// Helper to get current user from context
export const getCurrentUser = (c: any): AuthUser => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  return user;
};
