import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "@hono/clerk-auth";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../db";
import {
  createProjectSchema,
  updateProjectSchema,
  paginationSchema,
} from "../lib/schemas";
import { requireAuth, getCurrentUser } from "../middleware/auth";
import { getRepository } from "../services/github";

// Helper to get organization and check membership
async function getOrgWithAccess(userId: string, clerkOrgId: string | null | undefined) {
  if (!clerkOrgId) {
    throw new HTTPException(400, { message: "Organization context required" });
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!org) {
    throw new HTTPException(404, { message: "Organization not found" });
  }

  if (org.members.length === 0) {
    throw new HTTPException(403, { message: "Not a member of this organization" });
  }

  return { org, membership: org.members[0] };
}

export const projectRoutes = new Hono()
  // List organization's projects
  .get("/", requireAuth, zValidator("query", paginationSchema), async (c) => {
    const user = getCurrentUser(c);
    const auth = getAuth(c);
    const { page, limit } = c.req.valid("query");
    const skip = (page - 1) * limit;

    const { org } = await getOrgWithAccess(user.id, auth?.orgId);

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { organizationId: org.id },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: { elements: true },
          },
        },
      }),
      prisma.project.count({
        where: { organizationId: org.id },
      }),
    ]);

    return c.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        githubRepo: p.githubRepo,
        githubBranch: p.githubBranch,
        deploymentUrl: p.deploymentUrl,
        status: p.status,
        elementCount: p._count.elements,
        lastAnalyzedAt: p.lastAnalyzedAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })

  // Get single project
  .get("/:projectId", requireAuth, async (c) => {
    const user = getCurrentUser(c);
    const auth = getAuth(c);
    const projectId = c.req.param("projectId");

    const { org } = await getOrgWithAccess(user.id, auth?.orgId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            elements: true,
            pullRequests: true,
            teamMembers: true,
          },
        },
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!project || project.organizationId !== org.id) {
      return c.json({ error: "Project not found" }, 404);
    }

    return c.json({
      project: {
        id: project.id,
        name: project.name,
        githubRepo: project.githubRepo,
        githubBranch: project.githubBranch,
        deploymentUrl: project.deploymentUrl,
        status: project.status,
        lastAnalyzedAt: project.lastAnalyzedAt?.toISOString() || null,
        analysisError: project.analysisError,
        organization: project.organization,
        counts: project._count,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    });
  })

  // Create new project
  .post("/", requireAuth, zValidator("json", createProjectSchema), async (c) => {
    const user = getCurrentUser(c);
    const auth = getAuth(c);
    const input = c.req.valid("json");

    const { org, membership } = await getOrgWithAccess(user.id, auth?.orgId);

    // Only admins/owners can create projects
    if (!["owner", "admin"].includes(membership.role)) {
      throw new HTTPException(403, { message: "Admin access required to create projects" });
    }

    // Check if org has GitHub connected
    if (!org.githubAccessToken) {
      return c.json({ error: "Please connect GitHub to your organization first" }, 400);
    }

    // Parse owner/repo from the githubRepo input
    const [owner, repo] = input.githubRepo.split("/");
    if (!owner || !repo) {
      return c.json({ error: "Invalid GitHub repo format" }, 400);
    }

    // Validate GitHub repo access using org's token
    try {
      await getRepository(org.githubAccessToken, owner, repo);
    } catch (error) {
      return c.json(
        { error: "Cannot access repository. Please check permissions." },
        400
      );
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        createdById: user.id,
        name: input.name,
        githubRepo: input.githubRepo,
        githubBranch: input.githubBranch,
        deploymentUrl: input.deploymentUrl,
        status: "pending",
      },
    });

    return c.json(
      {
        project: {
          id: project.id,
          name: project.name,
          githubRepo: project.githubRepo,
          status: project.status,
          createdAt: project.createdAt.toISOString(),
        },
      },
      201
    );
  })

  // Update project
  .patch(
    "/:projectId",
    requireAuth,
    zValidator("json", updateProjectSchema),
    async (c) => {
      const user = getCurrentUser(c);
      const auth = getAuth(c);
      const projectId = c.req.param("projectId");
      const input = c.req.valid("json");

      const { org, membership } = await getOrgWithAccess(user.id, auth?.orgId);

      // Only admins/owners can update projects
      if (!["owner", "admin"].includes(membership.role)) {
        throw new HTTPException(403, { message: "Admin access required" });
      }

      // Verify project belongs to org
      const existing = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!existing || existing.organizationId !== org.id) {
        return c.json({ error: "Project not found" }, 404);
      }

      const project = await prisma.project.update({
        where: { id: projectId },
        data: {
          ...input,
          updatedAt: new Date(),
        },
      });

      return c.json({
        project: {
          id: project.id,
          name: project.name,
          githubRepo: project.githubRepo,
          githubBranch: project.githubBranch,
          deploymentUrl: project.deploymentUrl,
          status: project.status,
          updatedAt: project.updatedAt.toISOString(),
        },
      });
    }
  )

  // Delete project
  .delete("/:projectId", requireAuth, async (c) => {
    const user = getCurrentUser(c);
    const auth = getAuth(c);
    const projectId = c.req.param("projectId");

    const { org, membership } = await getOrgWithAccess(user.id, auth?.orgId);

    // Only owners can delete projects
    if (membership.role !== "owner") {
      throw new HTTPException(403, { message: "Owner access required to delete projects" });
    }

    // Verify project belongs to org
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing || existing.organizationId !== org.id) {
      return c.json({ error: "Project not found" }, 404);
    }

    await prisma.project.delete({ where: { id: projectId } });

    return c.json({ success: true, deletedId: projectId });
  });
