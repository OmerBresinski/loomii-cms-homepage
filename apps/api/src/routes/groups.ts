import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../db";
import { z } from "zod";
import { requireAuth, requireProjectAccess, getCurrentUser } from "../middleware/auth";
import { extractGroupTemplate, fillTemplate } from "../services/template-extractor";
import { getInstallationToken } from "../services/github";

// Schema for adding a new item to a group
const addItemSchema = z.object({
  values: z.record(z.string()).describe("Placeholder values for the new item"),
  position: z.number().optional().describe("Position to insert at (default: end)"),
});

// Schema for updating group template
const updateTemplateSchema = z.object({
  templateCode: z.string(),
  placeholders: z.array(z.object({
    name: z.string(),
    description: z.string(),
    type: z.enum(["text", "href", "src", "alt"]),
  })),
});

export const groupRoutes = new Hono()
  // Get all element groups for a project
  .get("/", requireAuth, requireProjectAccess(), async (c) => {
    const projectId = c.req.param("projectId");

    const groups = await prisma.elementGroup.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { elements: true },
        },
        section: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ sourceFile: "asc" }, { startLine: "asc" }],
    });

    return c.json(
      {
        groups: groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          sourceFile: g.sourceFile,
          startLine: g.startLine,
          endLine: g.endLine,
          itemCount: g.itemCount,
          elementCount: g._count.elements,
          hasTemplate: !!g.templateCode,
          placeholders: g.placeholders,
          confidence: g.confidence,
          section: g.section ? { id: g.section.id, name: g.section.name } : null,
          createdAt: g.createdAt.toISOString(),
        })),
      },
      200
    );
  })

  // Get a single group with its elements
  .get("/:groupId", requireAuth, requireProjectAccess(), async (c) => {
    const projectId = c.req.param("projectId");
    const groupId = c.req.param("groupId");

    const group = await prisma.elementGroup.findFirst({
      where: { id: groupId, projectId },
      include: {
        elements: {
          orderBy: { groupIndex: "asc" },
        },
        section: {
          select: { id: true, name: true },
        },
      },
    });

    if (!group) {
      return c.json({ error: "Group not found" }, 404);
    }

    // Get pending edits for elements in this group
    const elementIds = group.elements.map((e) => e.id);
    const pendingEdits = await prisma.edit.findMany({
      where: {
        elementId: { in: elementIds },
        status: "pending_review",
        pullRequest: { status: "open" },
      },
      include: {
        pullRequest: {
          select: {
            id: true,
            githubPrNumber: true,
            githubPrUrl: true,
            status: true,
          },
        },
      },
    });

    const pendingEditByElement = new Map<string, (typeof pendingEdits)[0]>();
    for (const edit of pendingEdits) {
      if (!pendingEditByElement.has(edit.elementId)) {
        pendingEditByElement.set(edit.elementId, edit);
      }
    }

    return c.json(
      {
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          sourceFile: group.sourceFile,
          startLine: group.startLine,
          endLine: group.endLine,
          itemCount: group.itemCount,
          templateCode: group.templateCode,
          placeholders: group.placeholders,
          containerInfo: group.containerInfo,
          confidence: group.confidence,
          section: group.section,
          elements: group.elements.map((e) => {
            const pendingEdit = pendingEditByElement.get(e.id);
            return {
              id: e.id,
              name: e.name,
              type: e.type,
              groupIndex: e.groupIndex,
              sourceFile: e.sourceFile,
              sourceLine: e.sourceLine,
              currentValue: e.currentValue,
              pageUrl: e.pageUrl,
              hasPendingEdit: !!pendingEdit,
              pendingEdit: pendingEdit ? {
                id: pendingEdit.id,
                newValue: pendingEdit.newValue,
                pullRequest: pendingEdit.pullRequest,
              } : null,
            };
          }),
        },
      },
      200
    );
  })

  // Extract and store template for a group
  .post("/:groupId/extract-template", requireAuth, requireProjectAccess(), async (c) => {
    const projectId = c.req.param("projectId");
    const groupId = c.req.param("groupId");

    const group = await prisma.elementGroup.findFirst({
      where: { id: groupId, projectId },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!group) {
      return c.json({ error: "Group not found" }, 404);
    }

    if (!group.project.organization.githubInstallationId) {
      return c.json({ error: "GitHub not connected" }, 400);
    }

    const [owner, repo] = group.project.githubRepo.split("/");
    const accessToken = await getInstallationToken(
      group.project.organization.githubInstallationId
    );

    const template = await extractGroupTemplate({
      accessToken,
      owner: owner!,
      repo: repo!,
      branch: group.project.githubBranch,
      sourceFile: group.sourceFile,
      startLine: group.startLine,
      endLine: group.endLine,
      itemCount: group.itemCount,
    });

    if (!template) {
      return c.json({ error: "Failed to extract template" }, 500);
    }

    // Update the group with the extracted template
    await prisma.elementGroup.update({
      where: { id: groupId },
      data: {
        templateCode: template.templateCode,
        placeholders: template.placeholders,
        containerInfo: template.containerInfo,
      },
    });

    return c.json(
      {
        success: true,
        template: {
          templateCode: template.templateCode,
          placeholders: template.placeholders,
          containerInfo: template.containerInfo,
        },
      },
      200
    );
  })

  // Update template manually
  .put("/:groupId/template", requireAuth, requireProjectAccess(), zValidator("json", updateTemplateSchema), async (c) => {
    const projectId = c.req.param("projectId");
    const groupId = c.req.param("groupId");
    const { templateCode, placeholders } = c.req.valid("json");

    const group = await prisma.elementGroup.findFirst({
      where: { id: groupId, projectId },
    });

    if (!group) {
      return c.json({ error: "Group not found" }, 404);
    }

    await prisma.elementGroup.update({
      where: { id: groupId },
      data: {
        templateCode,
        placeholders,
      },
    });

    return c.json({ success: true }, 200);
  })

  // Add a new item to a group (creates an "add" edit)
  .post("/:groupId/items", requireAuth, requireProjectAccess(), zValidator("json", addItemSchema), async (c) => {
    const projectId = c.req.param("projectId")!;
    const groupId = c.req.param("groupId");
    const user = getCurrentUser(c);
    const { values, position } = c.req.valid("json");

    const group = await prisma.elementGroup.findFirst({
      where: { id: groupId, projectId },
      include: {
        elements: {
          orderBy: { groupIndex: "asc" },
        },
        section: true,
      },
    });

    if (!group) {
      return c.json({ error: "Group not found" }, 404);
    }

    if (!group.templateCode) {
      return c.json({ error: "Group has no template. Extract template first." }, 400);
    }

    // Use sectionId from existing elements (they're the source of truth for where the group displays)
    // Fall back to group.sectionId only if no elements exist
    const sectionId = group.elements[0]?.sectionId || group.sectionId;

    // Generate the filled template code
    const filledCode = fillTemplate(group.templateCode, values);

    // Determine the new item's index
    const newIndex = position !== undefined ? position : group.elements.length;

    // Extract text and href separately for proper storage
    const textValue = values.TEXT || values.text || Object.values(values)[0] || "";
    const hrefValue = values.HREF || values.href || "";
    const isLink = group.elements[0]?.type === "link";

    // Create a placeholder element for the new item
    const newElement = await prisma.element.create({
      data: {
        projectId,
        sectionId,
        groupId: group.id,
        groupIndex: newIndex,
        name: `New ${group.name} Item`,
        type: (group.elements[0]?.type as any) || "custom",
        sourceFile: group.sourceFile,
        sourceLine: group.endLine,
        currentValue: textValue,
        schema: isLink && hrefValue ? { href: hrefValue } : undefined,
        pageUrl: group.pageUrl || group.elements[0]?.pageUrl || "/",
      },
    });

    // Create an "add" edit for this new element
    const edit = await prisma.edit.create({
      data: {
        elementId: newElement.id,
        userId: user.id,
        editType: "add",
        oldValue: null,
        newValue: filledCode,
        newHref: isLink && hrefValue ? hrefValue : undefined,  // Store href separately
        templateData: {
          values,
          insertAfterLine: group.endLine,
          indentation: (group.containerInfo as any)?.indentation || "",
        },
        status: "draft",
      },
    });

    // Update group item count
    await prisma.elementGroup.update({
      where: { id: groupId },
      data: { itemCount: group.itemCount + 1 },
    });

    return c.json(
      {
        success: true,
        element: {
          id: newElement.id,
          groupIndex: newIndex,
        },
        edit: {
          id: edit.id,
          editType: edit.editType,
          newValue: edit.newValue,
        },
      },
      201
    );
  })

  // Delete an item from a group (creates a "delete" edit)
  .delete("/:groupId/items/:elementId", requireAuth, requireProjectAccess(), async (c) => {
    const projectId = c.req.param("projectId");
    const groupId = c.req.param("groupId");
    const elementId = c.req.param("elementId");
    const user = getCurrentUser(c);

    const element = await prisma.element.findFirst({
      where: {
        id: elementId,
        groupId,
        projectId,
      },
      include: {
        group: true,
      },
    });

    if (!element) {
      return c.json({ error: "Element not found in group" }, 404);
    }

    if (!element.group) {
      return c.json({ error: "Element is not part of a group" }, 400);
    }

    // Create a "delete" edit
    const edit = await prisma.edit.create({
      data: {
        elementId,
        userId: user.id,
        editType: "delete",
        oldValue: element.currentValue,
        newValue: "", // Empty for delete
        deletedCode: element.currentValue, // Store what's being deleted
        status: "draft",
      },
    });

    return c.json(
      {
        success: true,
        edit: {
          id: edit.id,
          editType: edit.editType,
          elementId,
        },
      },
      200
    );
  });
