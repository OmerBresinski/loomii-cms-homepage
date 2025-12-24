import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getAuth } from "@hono/clerk-auth";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../db";
import { requireAuth, getCurrentUser } from "../middleware/auth";
import { getAppInstallationUrl, getInstallationRepositories, getInstallationToken } from "../services/github";

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
          hasGitHubConnected: !!org.githubInstallationId,
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

      // Check if organization already exists
      const existingOrg = await prisma.organization.findUnique({
        where: { clerkOrgId: input.clerkOrgId },
      });

      // If slug is being changed and conflicts with another org, skip slug update
      let updateData: {
        name: string;
        slug?: string;
        logoUrl: string | null;
      } = {
        name: input.name,
        logoUrl: input.logoUrl ?? null,
      };

      if (existingOrg) {
        // Only update slug if it's different and doesn't conflict
        if (existingOrg.slug !== input.slug) {
          const slugConflict = await prisma.organization.findUnique({
            where: { slug: input.slug },
          });
          // Only update slug if there's no conflict or if the conflict is the same org
          if (!slugConflict || slugConflict.id === existingOrg.id) {
            updateData.slug = input.slug;
          }
        }
      } else {
        // For create, check if slug exists
        const slugConflict = await prisma.organization.findUnique({
          where: { slug: input.slug },
        });
        if (slugConflict) {
          // Generate a unique slug by appending a suffix
          let uniqueSlug = input.slug;
          let counter = 1;
          while (
            await prisma.organization.findUnique({
              where: { slug: uniqueSlug },
            })
          ) {
            uniqueSlug = `${input.slug}-${counter}`;
            counter++;
          }
          input.slug = uniqueSlug;
        }
      }

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
        update: updateData,
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
  // GitHub App Connection Flow
  // ============================================

  // Initiate GitHub App installation for organization
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

    // Encode orgId in state to identify the org after installation
    const state = Buffer.from(
      JSON.stringify({ orgId, nonce: crypto.randomUUID() })
    ).toString("base64url");

    // Redirect to GitHub App installation page
    const url = getAppInstallationUrl(state);

    console.log("GitHub App installation URL:", url);

    return c.json({ url, state }, 200);
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
    if (!org.githubInstallationId) {
      return c.json({ error: "GitHub not connected" }, 400);
    }

    try {
      // Use installation token to fetch repos
      const repos = await getInstallationRepositories(org.githubInstallationId);

      return c.json(
        {
          repos: repos.map((repo) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: null,
            private: repo.private,
            defaultBranch: repo.default_branch,
            url: repo.html_url,
            updatedAt: null,
          })),
        },
        200
      );
    } catch (error) {
      console.error("GitHub API error:", error);
      return c.json({ error: "Failed to fetch repositories" }, 500);
    }
  })

  // Get folders in a repository (for monorepo support)
  .get("/:orgId/github/repos/:owner/:repo/folders", requireAuth, async (c) => {
    const user = getCurrentUser(c);
    const orgId = c.req.param("orgId");
    const owner = c.req.param("owner");
    const repo = c.req.param("repo");
    const branch = c.req.query("branch") || "main";

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
    if (!org.githubInstallationId) {
      return c.json({ error: "GitHub not connected" }, 400);
    }

    try {
      // Get installation token
      const token = await getInstallationToken(org.githubInstallationId);

      // Fetch the repository tree from GitHub API
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch repository tree");
      }

      const data = (await response.json()) as {
        tree?: Array<{ type: string; path: string }>;
      };

      // Filter to only directories and extract unique folder paths
      const folders = new Set<string>();
      folders.add(""); // Root option

      for (const item of data.tree || []) {
        if (item.type === "tree") {
          // Add the folder itself
          folders.add(item.path);
        } else if (item.type === "blob" && item.path.includes("/")) {
          // Extract parent folders from file paths
          const parts = item.path.split("/");
          let currentPath = "";
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (part) {
              currentPath = currentPath ? `${currentPath}/${part}` : part;
              folders.add(currentPath);
            }
          }
        }
      }

      // Convert to sorted array and filter out common non-source folders
      const excludePatterns = [
        /^\./, // Hidden folders
        /^node_modules/,
        /^dist/,
        /^build/,
        /^\.git/,
        /^coverage/,
        /^__pycache__/,
        /^\.next/,
        /^\.nuxt/,
        /^\.cache/,
      ];

      const sortedFolders = Array.from(folders)
        .filter((f) => !excludePatterns.some((p) => p.test(f)))
        .sort((a, b) => {
          if (a === "") return -1;
          if (b === "") return 1;
          return a.localeCompare(b);
        });

      return c.json(
        {
          folders: sortedFolders.map((path) => ({
            path,
            name: path === "" ? "(root)" : path.split("/").pop(),
            depth: path === "" ? 0 : path.split("/").length,
          })),
        },
        200
      );
    } catch (error) {
      console.error("GitHub API error:", error);
      return c.json({ error: "Failed to fetch folders" }, 500);
    }
  })

  // Get branches in a repository
  .get("/:orgId/github/repos/:owner/:repo/branches", requireAuth, async (c) => {
    const user = getCurrentUser(c);
    const orgId = c.req.param("orgId");
    const owner = c.req.param("owner");
    const repo = c.req.param("repo");

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
    if (!org.githubInstallationId) {
      return c.json({ error: "GitHub not connected" }, 400);
    }

    try {
      // Get installation token
      const token = await getInstallationToken(org.githubInstallationId);

      // Fetch branches from GitHub API
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch branches");
      }

      const data = (await response.json()) as Array<{
        name: string;
        protected: boolean;
      }>;

      return c.json(
        {
          branches: data.map((branch) => ({
            name: branch.name,
            protected: branch.protected,
          })),
        },
        200
      );
    } catch (error) {
      console.error("GitHub API error:", error);
      return c.json({ error: "Failed to fetch branches" }, 500);
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
