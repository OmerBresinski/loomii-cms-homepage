import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../db";
import {
  createEditSchema,
  submitEditSchema,
  paginationSchema,
} from "../lib/schemas";
import { z } from "zod";
import { requireAuth, requireProjectAccess } from "../middleware/auth";
import {
  generateAllChanges,
  createContentPR,
  generatePRTitle,
  generatePRDescription,
} from "../services/pr-generator";

const editFilterSchema = paginationSchema.extend({
  status: z.enum(["draft", "pending_review", "approved", "rejected"]).optional(),
  elementId: z.string().uuid().optional(),
});

export const editRoutes = new Hono()
  // List edits for a project
  .get(
    "/",
    requireAuth,
    requireProjectAccess(),
    zValidator("query", editFilterSchema),
    async (c) => {
      const projectId = c.req.param("projectId");
      const { page, limit, status, elementId } = c.req.valid("query");
      const skip = (page - 1) * limit;

      const where = {
        element: { projectId },
        ...(status && { status }),
        ...(elementId && { elementId }),
      };

      const [edits, total] = await Promise.all([
        prisma.edit.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            element: {
              select: { id: true, name: true, type: true, pageUrl: true },
            },
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
            pullRequest: {
              select: { id: true, githubPrNumber: true, githubPrUrl: true, status: true },
            },
          },
        }),
        prisma.edit.count({ where }),
      ]);

      return c.json({
        edits: edits.map((e) => ({
          id: e.id,
          elementId: e.elementId,
          element: e.element,
          oldValue: e.oldValue,
          newValue: e.newValue,
          status: e.status,
          user: e.user,
          pullRequest: e.pullRequest,
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  )

  // Create a new edit (draft)
  .post(
    "/",
    requireAuth,
    requireProjectAccess("editor"),
    zValidator("json", createEditSchema),
    async (c) => {
      const projectId = c.req.param("projectId");
      const user = c.get("user");
      const input = c.req.valid("json");

      // Verify element belongs to project
      const element = await prisma.element.findFirst({
        where: { id: input.elementId, projectId },
      });

      if (!element) {
        return c.json({ error: "Element not found" }, 404);
      }

      const edit = await prisma.edit.create({
        data: {
          elementId: input.elementId,
          userId: user.id,
          oldValue: element.currentValue,
          newValue: input.newValue,
          status: "draft",
        },
        include: {
          element: {
            select: { id: true, name: true, type: true },
          },
        },
      });

      return c.json(
        {
          edit: {
            id: edit.id,
            elementId: edit.elementId,
            element: edit.element,
            oldValue: edit.oldValue,
            newValue: edit.newValue,
            status: edit.status,
            createdAt: edit.createdAt.toISOString(),
          },
        },
        201
      );
    }
  )

  // Update edit (only drafts)
  .patch(
    "/:editId",
    requireAuth,
    requireProjectAccess("editor"),
    zValidator("json", z.object({ newValue: z.string() })),
    async (c) => {
      const editId = c.req.param("editId");
      const input = c.req.valid("json");

      const edit = await prisma.edit.findUnique({ where: { id: editId } });

      if (!edit) {
        return c.json({ error: "Edit not found" }, 404);
      }

      if (edit.status !== "draft") {
        return c.json({ error: "Can only modify draft edits" }, 400);
      }

      const updated = await prisma.edit.update({
        where: { id: editId },
        data: { newValue: input.newValue },
      });

      return c.json({
        edit: {
          id: updated.id,
          newValue: updated.newValue,
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }
  )

  // Delete edit (only drafts)
  .delete(
    "/:editId",
    requireAuth,
    requireProjectAccess("editor"),
    async (c) => {
      const editId = c.req.param("editId");

      const edit = await prisma.edit.findUnique({ where: { id: editId } });

      if (!edit) {
        return c.json({ error: "Edit not found" }, 404);
      }

      if (edit.status !== "draft") {
        return c.json({ error: "Can only delete draft edits" }, 400);
      }

      await prisma.edit.delete({ where: { id: editId } });

      return c.json({ success: true, deletedId: editId });
    }
  )

  // Submit edits for review (creates PR)
  .post(
    "/submit",
    requireAuth,
    requireProjectAccess("editor"),
    zValidator("json", submitEditSchema),
    async (c) => {
      const projectId = c.req.param("projectId");
      const user = c.get("user");
      const input = c.req.valid("json");

      // Get project and edits
      const [project, edits] = await Promise.all([
        prisma.project.findUnique({ where: { id: projectId } }),
        prisma.edit.findMany({
          where: {
            id: { in: input.editIds },
            status: "draft",
            element: { projectId },
          },
          include: { element: true },
        }),
      ]);

      if (!project) {
        return c.json({ error: "Project not found" }, 404);
      }

      if (edits.length !== input.editIds.length) {
        return c.json({ error: "Some edits not found or not in draft status" }, 400);
      }

      // Parse owner/repo
      const [owner, repo] = project.githubRepo.split("/");
      if (!owner || repo === undefined) {
        return c.json({ error: "Invalid GitHub repo format" }, 400);
      }

      try {
        // Generate code changes
        const changes = await generateAllChanges(
          edits.map((e) => ({ edit: e, element: e.element })),
          {
            accessToken: user.githubAccessToken,
            owner,
            repo,
            baseBranch: project.githubBranch,
          }
        );

        if (changes.length === 0) {
          return c.json({ error: "Could not generate any code changes" }, 400);
        }

        // Use provided title/description or generate defaults
        const prTitle = input.prTitle || generatePRTitle(edits.map((e) => ({ element: e.element })));
        const prDescription = input.prDescription || generatePRDescription(edits.map((e) => ({ edit: e, element: e.element })));

        // Create the PR
        const { prNumber, prUrl, branchName } = await createContentPR(
          project.name,
          changes,
          prTitle,
          prDescription,
          {
            accessToken: user.githubAccessToken,
            owner,
            repo,
            baseBranch: project.githubBranch,
          }
        );

        // Create PR record and update edits
        const pullRequest = await prisma.pullRequest.create({
          data: {
            projectId,
            userId: user.id,
            githubPrNumber: prNumber,
            githubPrUrl: prUrl,
            title: prTitle,
            description: prDescription,
            status: "open",
          },
        });

        await prisma.edit.updateMany({
          where: { id: { in: input.editIds } },
          data: {
            status: "pending_review",
            pullRequestId: pullRequest.id,
          },
        });

        return c.json({
          pullRequest: {
            id: pullRequest.id,
            githubPrNumber: prNumber,
            githubPrUrl: prUrl,
            title: prTitle,
            branchName,
            status: "open",
            editCount: edits.length,
            createdAt: pullRequest.createdAt.toISOString(),
          },
        });
      } catch (error) {
        console.error("Failed to create PR:", error);
        return c.json(
          { error: error instanceof Error ? error.message : "Failed to create PR" },
          500
        );
      }
    }
  )

  // Get PR status for project
  .get(
    "/pull-requests",
    requireAuth,
    requireProjectAccess(),
    async (c) => {
      const projectId = c.req.param("projectId");

      const pullRequests = await prisma.pullRequest.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
          _count: {
            select: { edits: true },
          },
        },
      });

      return c.json({
        pullRequests: pullRequests.map((pr) => ({
          id: pr.id,
          githubPrNumber: pr.githubPrNumber,
          githubPrUrl: pr.githubPrUrl,
          title: pr.title,
          status: pr.status,
          user: pr.user,
          editCount: pr._count.edits,
          mergedAt: pr.mergedAt?.toISOString() || null,
          createdAt: pr.createdAt.toISOString(),
        })),
      });
    }
  );
