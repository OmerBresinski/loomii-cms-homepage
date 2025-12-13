import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@ai-cms/db";
import {
  createProjectSchema,
  updateProjectSchema,
  paginationSchema,
} from "@ai-cms/shared";
import { requireAuth, requireProjectAccess } from "../middleware/auth";
import { getRepository } from "../services/github";

export const projectRoutes = new Hono()
  // List user's projects
  .get("/", requireAuth, zValidator("query", paginationSchema), async (c) => {
    const user = c.get("user");
    const { page, limit } = c.req.valid("query");
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: {
          OR: [
            { userId: user.id },
            { teamMembers: { some: { userId: user.id } } },
          ],
        },
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
        where: {
          OR: [
            { userId: user.id },
            { teamMembers: { some: { userId: user.id } } },
          ],
        },
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
  .get("/:projectId", requireAuth, requireProjectAccess(), async (c) => {
    const projectId = c.req.param("projectId");

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
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!project) {
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
        owner: project.user,
        counts: project._count,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    });
  })

  // Create new project
  .post("/", requireAuth, zValidator("json", createProjectSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");

    // Parse owner/repo from the githubRepo input
    const [owner, repo] = input.githubRepo.split("/");
    if (!owner || !repo) {
      return c.json({ error: "Invalid GitHub repo format" }, 400);
    }

    // Validate GitHub repo access
    try {
      await getRepository(user.githubAccessToken, owner, repo);
    } catch (error) {
      return c.json(
        { error: "Cannot access repository. Please check permissions." },
        400
      );
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
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
    requireProjectAccess("admin"),
    zValidator("json", updateProjectSchema),
    async (c) => {
      const projectId = c.req.param("projectId");
      const input = c.req.valid("json");

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
  .delete(
    "/:projectId",
    requireAuth,
    requireProjectAccess("owner"),
    async (c) => {
      const projectId = c.req.param("projectId");

      await prisma.project.delete({ where: { id: projectId } });

      return c.json({ success: true, deletedId: projectId });
    }
  );
