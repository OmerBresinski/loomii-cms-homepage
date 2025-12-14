import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getAuth } from "@hono/clerk-auth";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../db";
import { requireAuth, getCurrentUser } from "../middleware/auth";
import { exchangeCodeForToken, getGitHubUser } from "../services/github";
import { keyframes } from "hono/css";

// Schemas
const createOrgSchema = z.object({
  clerkOrgId: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  logoUrl: z.string().url().optional().nullable(),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().optional().nullable(),
});

const githubLinkSchema = z.object({
  code: z.string(),
});

export const organizationRoutes = new Hono()
  // Get current organization (from Clerk context)
  .get("/current", requireAuth, async (c) => {
    const auth = getAuth(c);
    const clerkOrgId = auth?.orgId;

    if (!clerkOrgId) {
      return c.json({ organization: null }, 200);
    }

    const org = await prisma.organization.findUnique({
      where: { clerkOrgId },
      include: {
        _count: {
          select: { members: true, projects: true },
        },
      },
    });

    if (!org) {
      // Organization exists in Clerk but not in our DB yet
      return c.json({ organization: null, needsSync: true }, 200);
    }

    return c.json(
      {
        organization: {
          id: org.id,
          clerkOrgId: org.clerkOrgId,
          name: org.name,
          slug: org.slug,
          logoUrl: org.logoUrl,
          hasGitHubConnected: !!org.githubAccessToken,
          githubOrgName: org.githubOrgName,
          memberCount: org._count.members,
          projectCount: org._count.projects,
          createdAt: org.createdAt.toISOString(),
        },
      },
      200
    );
  })

  // Sync/create organization from Clerk
  .post(
    "/sync",
    requireAuth,
    zValidator("json", createOrgSchema),
    async (c) => {
      const user = getCurrentUser(c);
      const input = c.req.valid("json");

      // Upsert organization
      const org = await prisma.organization.upsert({
        where: { clerkOrgId: input.clerkOrgId },
        create: {
          clerkOrgId: input.clerkOrgId,
          name: input.name,
          slug: input.slug,
          logoUrl: input.logoUrl,
          members: {
            create: {
              userId: user.id,
              role: "owner",
            },
          },
        },
        update: {
          name: input.name,
          slug: input.slug,
          logoUrl: input.logoUrl,
        },
      });

      // Ensure user is a member
      await prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: user.id,
          },
        },
        create: {
          organizationId: org.id,
          userId: user.id,
          role: "owner",
        },
        update: {},
      });

      return c.json(
        {
          organization: {
            id: org.id,
            clerkOrgId: org.clerkOrgId,
            name: org.name,
            slug: org.slug,
            logoUrl: org.logoUrl,
          },
        },
        200
      );
    }
  )

  // Update organization
  .patch(
    "/:orgId",
    requireAuth,
    zValidator("json", updateOrgSchema),
    async (c) => {
      const user = getCurrentUser(c);
      const orgId = c.req.param("orgId");
      const input = c.req.valid("json");

      // Check user is admin/owner of org
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: { organizationId: orgId, userId: user.id },
        },
      });

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new HTTPException(403, { message: "Admin access required" });
      }

      const org = await prisma.organization.update({
        where: { id: orgId },
        data: input,
      });

      return c.json(
        {
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            logoUrl: org.logoUrl,
          },
        },
        200
      );
    }
  )

  // ============================================
  // GitHub Connection Flow
  // ============================================

  // Initiate GitHub OAuth for organization
  .get("/:orgId/github/connect", requireAuth, async (c) => {
    const user = getCurrentUser(c);
    const orgId = c.req.param("orgId");

    // Check user has access to org
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId: user.id },
      },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new HTTPException(403, {
        message: "Admin access required to connect GitHub",
      });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return c.json({ error: "GitHub OAuth not configured" }, 500);
    }

    // Use a single callback URL - pass orgId in state
    const redirectUri = `${process.env.API_URL || "http://localhost:3001"}/github/callback`;
    const scope = "read:user user:email repo read:org";

    // Encode orgId in state for CSRF protection and to identify the org
    const state = Buffer.from(
      JSON.stringify({ orgId, nonce: crypto.randomUUID() })
    ).toString("base64url");

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);

    console.log({ clientId, authUrl: authUrl.toString() });

    return c.json({ url: authUrl.toString(), state }, 200);
  })

  // Disconnect GitHub from organization
  .delete("/:orgId/github", requireAuth, async (c) => {
    const user = getCurrentUser(c);
    const orgId = c.req.param("orgId");

    // Check user has access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId: user.id },
      },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new HTTPException(403, { message: "Admin access required" });
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        githubAccessToken: null,
        githubOrgName: null,
        githubInstallationId: null,
      },
    });

    return c.json({ success: true }, 200);
  })

  // Get GitHub repositories for organization
  .get("/:orgId/github/repos", requireAuth, async (c) => {
    const user = getCurrentUser(c);
    const orgId = c.req.param("orgId");

    // Check user has access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId: user.id },
      },
      include: { organization: true },
    });

    if (!membership) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const org = membership.organization;
    if (!org.githubAccessToken) {
      return c.json({ error: "GitHub not connected" }, 400);
    }

    try {
      // Fetch repos from GitHub API
      const response = await fetch(
        "https://api.github.com/user/repos?per_page=100&sort=updated",
        {
          headers: {
            Authorization: `Bearer ${org.githubAccessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }

      const repos = await response.json();

      return c.json(
        {
          repos: repos.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            private: repo.private,
            defaultBranch: repo.default_branch,
            url: repo.html_url,
            updatedAt: repo.updated_at,
          })),
        },
        200
      );
    } catch (error) {
      console.error("GitHub API error:", error);
      return c.json({ error: "Failed to fetch repositories" }, 500);
    }
  })

  // List organization members
  .get("/:orgId/members", requireAuth, async (c) => {
    const user = getCurrentUser(c);
    const orgId = c.req.param("orgId");

    // Check user has access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId: user.id },
      },
    });

    if (!membership) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return c.json(
      {
        members: members.map((m) => ({
          id: m.id,
          user: m.user,
          role: m.role,
          createdAt: m.createdAt.toISOString(),
        })),
      },
      200
    );
  });
