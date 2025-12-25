import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../db";
import {
  createEditSchema,
  submitEditSchema,
  publishEditsSchema,
  paginationSchema,
} from "../lib/schemas";
import { z } from "zod";
import { requireAuth, requireProjectAccess, getCurrentUser } from "../middleware/auth";
import {
  generateAllChanges,
  createContentPR,
  generatePRTitle,
  generatePRDescription,
} from "../services/pr-generator";
import { getInstallationToken } from "../services/github";

const editFilterSchema = paginationSchema.extend({
  status: z
    .enum(["draft", "pending_review", "approved", "rejected"])
    .optional(),
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
              select: {
                id: true,
                githubPrNumber: true,
                githubPrUrl: true,
                status: true,
              },
            },
          },
        }),
        prisma.edit.count({ where }),
      ]);

      return c.json(
        {
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
        },
        200
      );
    }
  )

  // Create a new edit (draft)
  .post(
    "/",
    requireAuth,
    requireProjectAccess(),
    zValidator("json", createEditSchema),
    async (c) => {
      const projectId = c.req.param("projectId")!;
      const user = getCurrentUser(c);
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
    requireProjectAccess(),
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

      return c.json(
        {
          edit: {
            id: updated.id,
            newValue: updated.newValue,
            updatedAt: updated.updatedAt.toISOString(),
          },
        },
        200
      );
    }
  )

  // Delete edit (only drafts)
  .delete(
    "/:editId",
    requireAuth,
    requireProjectAccess(),
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

      return c.json({ success: true, deletedId: editId }, 200);
    }
  )

  // Submit edits for review (creates PR)
  .post(
    "/submit",
    requireAuth,
    requireProjectAccess(),
    zValidator("json", submitEditSchema),
    async (c) => {
      const projectId = c.req.param("projectId")!;
      const user = getCurrentUser(c);
      const input = c.req.valid("json");

      // Get project and edits
      const [project, edits] = await Promise.all([
        prisma.project.findUnique({
          where: { id: projectId },
          include: { organization: true },
        }),
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

      if (!project.organization.githubInstallationId) {
        return c.json({ error: "GitHub not connected. Please reconnect GitHub in settings." }, 400);
      }

      if (edits.length !== input.editIds.length) {
        return c.json(
          { error: "Some edits not found or not in draft status" },
          400
        );
      }

      // Parse owner/repo
      const [owner, repo] = project.githubRepo.split("/");
      if (!owner || repo === undefined) {
        return c.json({ error: "Invalid GitHub repo format" }, 400);
      }

      try {
        // Get installation token for GitHub App
        const accessToken = await getInstallationToken(project.organization.githubInstallationId);

        // Generate code changes
        const changes = await generateAllChanges(
          edits.map((e) => ({ edit: e, element: e.element })),
          {
            accessToken,
            owner,
            repo,
            baseBranch: project.githubBranch,
          }
        );

        if (changes.length === 0) {
          return c.json({ error: "Could not generate any code changes" }, 400);
        }

        // Use provided title/description or generate defaults
        const prTitle =
          input.prTitle ||
          generatePRTitle(edits.map((e) => ({ element: e.element })));
        const prDescription =
          input.prDescription ||
          generatePRDescription(
            edits.map((e) => ({ edit: e, element: e.element }))
          );

        // Create the PR
        const { prNumber, prUrl, branchName } = await createContentPR(
          project.name,
          changes,
          prTitle,
          prDescription,
          {
            accessToken,
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

        return c.json(
          {
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
          },
          201
        );
      } catch (error) {
        console.error("Failed to create PR:", error);
        return c.json(
          {
            error:
              error instanceof Error ? error.message : "Failed to create PR",
          },
          500
        );
      }
    }
  )

  // Publish edits directly (creates Edit records + PR in one call)
  // This endpoint accepts pending edits from the frontend and creates a PR
  .post(
    "/publish",
    requireAuth,
    requireProjectAccess(),
    zValidator("json", publishEditsSchema),
    async (c) => {
      const projectId = c.req.param("projectId")!;
      const user = getCurrentUser(c);
      const input = c.req.valid("json");

      // Get project with organization (for GitHub token)
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { organization: true },
      });

      if (!project) {
        return c.json({ error: "Project not found" }, 404);
      }

      if (!project.organization.githubInstallationId) {
        return c.json({ error: "GitHub not connected. Please reconnect GitHub in settings." }, 400);
      }

      // Parse owner/repo
      const [owner, repo] = project.githubRepo.split("/");
      if (!owner || repo === undefined) {
        return c.json({ error: "Invalid GitHub repo format" }, 400);
      }

      // Get all elements referenced by the edits
      const elementIds = input.edits.map((e) => e.elementId);
      const elements = await prisma.element.findMany({
        where: {
          id: { in: elementIds },
          projectId,
        },
      });

      // Create a map for quick lookup
      const elementMap = new Map(elements.map((el) => [el.id, el]));

      // Validate all elements exist and have source files
      const missingElements = elementIds.filter((id) => !elementMap.has(id));
      if (missingElements.length > 0) {
        return c.json(
          { error: `Elements not found: ${missingElements.join(", ")}` },
          404
        );
      }

      const elementsWithoutSource = elements.filter((el) => !el.sourceFile);
      if (elementsWithoutSource.length > 0) {
        return c.json(
          {
            error: `Elements missing source file info: ${elementsWithoutSource.map((el) => el.name).join(", ")}`,
          },
          400
        );
      }

      try {
        // Get installation token for GitHub App
        const accessToken = await getInstallationToken(project.organization.githubInstallationId);

        // Create Edit records in the database (including href for link elements)
        const createdEdits = await prisma.$transaction(
          input.edits.map((editInput) => {
            const element = elementMap.get(editInput.elementId)!;
            return prisma.edit.create({
              data: {
                elementId: editInput.elementId,
                userId: user.id,
                oldValue: editInput.originalValue,
                newValue: editInput.newValue,
                oldHref: editInput.originalHref,
                newHref: editInput.newHref,
                status: "draft",
              },
            });
          })
        );

        // Build edit+element pairs for PR generation
        // Href values are now stored in the Edit record
        const editElementPairs = createdEdits.map((edit, index) => {
          console.log(`[Publish] Edit ${index}:`, {
            elementId: edit.elementId,
            originalValue: edit.oldValue?.slice(0, 50),
            newValue: edit.newValue?.slice(0, 50),
            oldHref: edit.oldHref,
            newHref: edit.newHref,
          });
          return {
            edit,
            element: elementMap.get(edit.elementId)!,
          };
        });

        // Generate code changes
        const changes = await generateAllChanges(editElementPairs, {
          accessToken,
          owner,
          repo,
          baseBranch: project.githubBranch,
        });

        if (changes.length === 0) {
          // Rollback: delete the created edits
          await prisma.edit.deleteMany({
            where: { id: { in: createdEdits.map((e) => e.id) } },
          });
          return c.json(
            { error: "Could not generate any code changes. The content may not exist in the source files." },
            400
          );
        }

        // Generate PR title and description
        const prTitle = generatePRTitle(editElementPairs);
        const prDescription = generatePRDescription(editElementPairs);

        // Create the PR
        const { prNumber, prUrl, branchName } = await createContentPR(
          project.name,
          changes,
          prTitle,
          prDescription,
          {
            accessToken,
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
          where: { id: { in: createdEdits.map((e) => e.id) } },
          data: {
            status: "pending_review",
            pullRequestId: pullRequest.id,
          },
        });

        return c.json(
          {
            pullRequest: {
              id: pullRequest.id,
              githubPrNumber: prNumber,
              githubPrUrl: prUrl,
              title: prTitle,
              branchName,
              status: "open",
              editCount: createdEdits.length,
              createdAt: pullRequest.createdAt.toISOString(),
            },
          },
          201
        );
      } catch (error) {
        console.error("Failed to publish edits:", error);
        return c.json(
          {
            error:
              error instanceof Error ? error.message : "Failed to create PR",
          },
          500
        );
      }
    }
  )

  // Get PR status for project
  .get("/pull-requests", requireAuth, requireProjectAccess(), async (c) => {
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

    return c.json(
      {
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
      },
      200
    );
  });
