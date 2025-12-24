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
};

// Organization context type
export type AuthOrg = {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  githubAccessToken: string | null;
  role: "owner" | "admin" | "member";
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
    // User doesn't exist yet - create a minimal user record
    // Get session claims for user info
    const sessionClaims = auth.sessionClaims as Record<string, unknown> | undefined;
    const email = (sessionClaims?.email as string) ||
                  (sessionClaims?.primary_email as string) ||
                  `${auth.userId}@placeholder.local`;
    const name = (sessionClaims?.name as string) ||
                 (sessionClaims?.full_name as string) ||
                 null;
    const avatarUrl = (sessionClaims?.image_url as string) ||
                      (sessionClaims?.profile_image_url as string) ||
                      null;

    try {
      user = await prisma.user.create({
        data: {
          clerkId: auth.userId,
          email,
          name,
          avatarUrl,
        },
      });
    } catch (error: unknown) {
      // Handle unique constraint violation on email
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        // Email already exists - update the existing user's clerkId or find by email
        user = await prisma.user.upsert({
          where: { clerkId: auth.userId },
          update: { email, name, avatarUrl },
          create: {
            clerkId: auth.userId,
            email: `${auth.userId}@user.local`, // Fallback unique email
            name,
            avatarUrl,
          },
        });
      } else {
        throw error;
      }
    }
  }

  // Add user to context
  c.set("user", {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  } as AuthUser);

  // If there's an organization context from Clerk, load it
  if (auth.orgId) {
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: auth.orgId },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (org && org.members.length > 0) {
      c.set("org", {
        id: org.id,
        clerkOrgId: org.clerkOrgId,
        name: org.name,
        slug: org.slug,
        githubAccessToken: org.githubAccessToken,
        role: org.members[0].role,
      } as AuthOrg);
    }
  }

  await next();
});

// Middleware to require organization context
export const requireOrg = createMiddleware(async (c, next) => {
  const org = c.get("org") as AuthOrg | undefined;

  if (!org) {
    throw new HTTPException(400, { message: "Organization context required" });
  }

  await next();
});

// Middleware to require organization admin/owner role
export const requireOrgAdmin = createMiddleware(async (c, next) => {
  const org = c.get("org") as AuthOrg | undefined;

  if (!org) {
    throw new HTTPException(400, { message: "Organization context required" });
  }

  if (!["owner", "admin"].includes(org.role)) {
    throw new HTTPException(403, { message: "Admin access required" });
  }

  await next();
});

// Middleware to require project access (within organization context)
export const requireProjectAccess = (requiredRole?: "admin" | "owner") => {
  return createMiddleware(async (c, next) => {
    const user = c.get("user") as AuthUser;
    const org = c.get("org") as AuthOrg | undefined;
    const projectId = c.req.param("projectId");

    if (!user || !projectId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
        teamMembers: {
          where: { userId: user.id },
        },
      },
    });

    if (!project) {
      throw new HTTPException(404, { message: "Project not found" });
    }

    // If org context is set, verify project belongs to that org
    if (org && project.organizationId !== org.id) {
      throw new HTTPException(404, { message: "Project not found" });
    }

    // Check organization membership
    const orgMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!orgMember) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const isOrgOwner = orgMember.role === "owner";
    const isOrgAdmin = orgMember.role === "admin";
    const teamMember = project.teamMembers[0];
    const isProjectAdmin = teamMember?.role === "admin" || teamMember?.role === "owner";

    // Check access based on required role
    if (requiredRole === "owner") {
      if (!isOrgOwner) {
        throw new HTTPException(403, { message: "Owner access required" });
      }
    }

    if (requiredRole === "admin") {
      if (!isOrgOwner && !isOrgAdmin && !isProjectAdmin) {
        throw new HTTPException(403, { message: "Admin access required" });
      }
    }

    // Store project in context for later use
    c.set("project", project);

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

// Helper to get current organization from context
export const getCurrentOrg = (c: any): AuthOrg | null => {
  return c.get("org") || null;
};
