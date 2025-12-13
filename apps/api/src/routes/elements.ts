import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../db";
import { paginationSchema } from "../lib/schemas";
import { z } from "zod";
import { requireAuth, requireProjectAccess } from "../middleware/auth";

const elementFilterSchema = paginationSchema.extend({
  type: z.string().optional(),
  pageUrl: z.string().optional(),
  search: z.string().optional(),
});

export const elementRoutes = new Hono()
  // List elements for a project
  .get(
    "/",
    requireAuth,
    requireProjectAccess(),
    zValidator("query", elementFilterSchema),
    async (c) => {
      const projectId = c.req.param("projectId");
      const { page, limit, type, pageUrl, search } = c.req.valid("query");
      const skip = (page - 1) * limit;

      const where = {
        projectId,
        ...(type && { type: type as any }),
        ...(pageUrl && { pageUrl }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { currentValue: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [elements, total] = await Promise.all([
        prisma.element.findMany({
          where,
          orderBy: [{ pageUrl: "asc" }, { confidence: "desc" }],
          skip,
          take: limit,
        }),
        prisma.element.count({ where }),
      ]);

      return c.json({
        elements: elements.map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type,
          selector: e.selector,
          currentValue: e.currentValue,
          pageUrl: e.pageUrl,
          confidence: e.confidence,
          sourceFile: e.sourceFile,
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

  // Get single element with full details
  .get(
    "/:elementId",
    requireAuth,
    requireProjectAccess(),
    async (c) => {
      const projectId = c.req.param("projectId");
      const elementId = c.req.param("elementId");

      const element = await prisma.element.findFirst({
        where: { id: elementId, projectId },
        include: {
          edits: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
      });

      if (!element) {
        return c.json({ error: "Element not found" }, 404);
      }

      return c.json({
        element: {
          id: element.id,
          name: element.name,
          type: element.type,
          selector: element.selector,
          xpath: element.xpath,
          sourceFile: element.sourceFile,
          sourceLine: element.sourceLine,
          sourceColumn: element.sourceColumn,
          currentValue: element.currentValue,
          schema: element.schema,
          pageUrl: element.pageUrl,
          screenshotUrl: element.screenshotUrl,
          confidence: element.confidence,
          recentEdits: element.edits.map((e) => ({
            id: e.id,
            oldValue: e.oldValue,
            newValue: e.newValue,
            status: e.status,
            user: e.user,
            createdAt: e.createdAt.toISOString(),
          })),
          createdAt: element.createdAt.toISOString(),
          updatedAt: element.updatedAt.toISOString(),
        },
      });
    }
  )

  // Get pages summary (grouped elements by page)
  .get(
    "/pages/summary",
    requireAuth,
    requireProjectAccess(),
    async (c) => {
      const projectId = c.req.param("projectId");

      const pages = await prisma.element.groupBy({
        by: ["pageUrl"],
        where: { projectId },
        _count: { id: true },
        _avg: { confidence: true },
      });

      return c.json({
        pages: pages.map((p) => ({
          url: p.pageUrl,
          elementCount: p._count.id,
          avgConfidence: p._avg.confidence,
        })),
      });
    }
  );
