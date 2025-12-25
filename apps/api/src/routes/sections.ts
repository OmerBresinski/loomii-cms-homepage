import { Hono } from "hono";
import { prisma } from "../db";
import { requireAuth, requireProjectAccess } from "../middleware/auth";

export const sectionRoutes = new Hono()
  // Get all sections for a project with element counts
  .get("/", requireAuth, requireProjectAccess(), async (c) => {
    const projectId = c.req.param("projectId");

    const sections = await prisma.section.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { elements: true },
        },
        elements: {
          select: { id: true, pageUrl: true },
          distinct: ["pageUrl"],
        },
      },
      orderBy: [{ sourceFile: "asc" }, { startLine: "asc" }],
    });

    // Get count of elements with pending edits per section (single aggregated query)
    const sectionIds = sections.map((s) => s.id);
    const pendingEditCounts = await prisma.edit.findMany({
      where: {
        status: "pending_review",
        pullRequest: { status: "open" },
        element: { sectionId: { in: sectionIds } },
      },
      select: {
        elementId: true,
        element: { select: { sectionId: true } },
      },
      distinct: ["elementId"], // Count each element only once
    });

    // Build map: sectionId -> count of elements with pending edits
    const pendingCountBySection = new Map<string, number>();
    for (const edit of pendingEditCounts) {
      const sectionId = edit.element.sectionId;
      if (sectionId) {
        pendingCountBySection.set(
          sectionId,
          (pendingCountBySection.get(sectionId) || 0) + 1
        );
      }
    }

    return c.json(
      {
        sections: sections.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          sourceFile: s.sourceFile,
          startLine: s.startLine,
          endLine: s.endLine,
          elementCount: s._count.elements,
          pendingEditCount: pendingCountBySection.get(s.id) || 0,
          pages: s.elements.map((e) => e.pageUrl),
          createdAt: s.createdAt.toISOString(),
        })),
      },
      200
    );
  })

  // Get a single section with all its elements
  .get("/:sectionId", requireAuth, requireProjectAccess(), async (c) => {
    const projectId = c.req.param("projectId");
    const sectionId = c.req.param("sectionId");

    const section = await prisma.section.findFirst({
      where: { id: sectionId, projectId },
      include: {
        elements: {
          orderBy: { sourceLine: "asc" },
        },
      },
    });

    if (!section) {
      return c.json({ error: "Section not found" }, 404);
    }

    // Get all pending edits for elements in this section (single query to avoid N+1)
    const elementIds = section.elements.map((e) => e.id);
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
            title: true,
          },
        },
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build map: elementId -> most recent pending edit
    const pendingEditByElement = new Map<string, (typeof pendingEdits)[0]>();
    for (const edit of pendingEdits) {
      if (!pendingEditByElement.has(edit.elementId)) {
        pendingEditByElement.set(edit.elementId, edit);
      }
    }

    return c.json(
      {
        section: {
          id: section.id,
          name: section.name,
          description: section.description,
          sourceFile: section.sourceFile,
          startLine: section.startLine,
          endLine: section.endLine,
          elements: section.elements.map((e) => {
            const pendingEdit = pendingEditByElement.get(e.id);
            return {
              id: e.id,
              name: e.name,
              type: e.type,
              sourceFile: e.sourceFile,
              sourceLine: e.sourceLine,
              currentValue: e.currentValue,
              sourceContext: e.sourceContext,
              schema: e.schema,
              confidence: e.confidence,
              pageUrl: e.pageUrl,
              pendingEdit: pendingEdit
                ? {
                    id: pendingEdit.id,
                    newValue: pendingEdit.newValue,
                    createdAt: pendingEdit.createdAt.toISOString(),
                    user: {
                      id: pendingEdit.user.id,
                      name: pendingEdit.user.name,
                      avatarUrl: pendingEdit.user.avatarUrl,
                    },
                    pullRequest: {
                      id: pendingEdit.pullRequest!.id,
                      githubPrNumber: pendingEdit.pullRequest!.githubPrNumber,
                      githubPrUrl: pendingEdit.pullRequest!.githubPrUrl,
                      status: pendingEdit.pullRequest!.status,
                      title: pendingEdit.pullRequest!.title,
                    },
                  }
                : null,
            };
          }),
        },
      },
      200
    );
  });

