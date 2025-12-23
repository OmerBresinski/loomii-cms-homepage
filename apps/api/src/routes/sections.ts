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
          select: { pageUrl: true },
          distinct: ["pageUrl"],
        },
      },
      orderBy: [{ sourceFile: "asc" }, { startLine: "asc" }],
    });

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

    return c.json(
      {
        section: {
          id: section.id,
          name: section.name,
          description: section.description,
          sourceFile: section.sourceFile,
          startLine: section.startLine,
          endLine: section.endLine,
          elements: section.elements.map((e) => ({
            id: e.id,
            name: e.name,
            type: e.type,
            sourceFile: e.sourceFile,
            sourceLine: e.sourceLine,
            currentValue: e.currentValue,
            schema: e.schema,
            confidence: e.confidence,
            pageUrl: e.pageUrl,
          })),
        },
      },
      200
    );
  });

