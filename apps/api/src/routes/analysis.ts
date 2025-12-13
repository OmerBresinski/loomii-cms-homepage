import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@ai-cms/db";
import { z } from "zod";
import { requireAuth, requireProjectAccess } from "../middleware/auth";
import { RATE_LIMIT_ANALYSIS_PER_HOUR } from "@ai-cms/shared";

const triggerAnalysisSchema = z.object({
  fullRescan: z.boolean().default(false),
  pageUrls: z.array(z.string().url()).optional(),
});

export const analysisRoutes = new Hono()
  // Get analysis status
  .get(
    "/status",
    requireAuth,
    requireProjectAccess(),
    async (c) => {
      const projectId = c.req.param("projectId");

      // Get latest analysis job
      const job = await prisma.analysisJob.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });

      // Get project status
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { status: true, lastAnalyzedAt: true, analysisError: true },
      });

      return c.json({
        projectStatus: project?.status || "pending",
        lastAnalyzedAt: project?.lastAnalyzedAt?.toISOString() || null,
        lastError: project?.analysisError || null,
        currentJob: job
          ? {
              id: job.id,
              status: job.status,
              progress: job.progress,
              totalPages: job.totalPages,
              startedAt: job.startedAt?.toISOString() || null,
              error: job.error,
            }
          : null,
      });
    }
  )

  // Trigger new analysis
  .post(
    "/trigger",
    requireAuth,
    requireProjectAccess("editor"),
    zValidator("json", triggerAnalysisSchema),
    async (c) => {
      const projectId = c.req.param("projectId");
      const input = c.req.valid("json");

      // Check rate limit
      const recentJobs = await prisma.analysisJob.count({
        where: {
          projectId,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });

      if (recentJobs >= RATE_LIMIT_ANALYSIS_PER_HOUR) {
        return c.json(
          { error: "Rate limit exceeded. Please wait before triggering another analysis." },
          429
        );
      }

      // Check if analysis is already running
      const runningJob = await prisma.analysisJob.findFirst({
        where: {
          projectId,
          status: { in: ["queued", "running"] },
        },
      });

      if (runningJob) {
        return c.json(
          { error: "Analysis already in progress", jobId: runningJob.id },
          409
        );
      }

      // Create new analysis job
      const job = await prisma.analysisJob.create({
        data: {
          projectId,
          status: "queued",
        },
      });

      // Update project status
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "analyzing" },
      });

      // In production, this would enqueue the job to a background worker
      // For now, we'll return the job ID for polling
      // TODO: Implement actual background job processing with Mastra workflows

      return c.json({
        jobId: job.id,
        status: "queued",
        message: "Analysis job has been queued",
      });
    }
  )

  // Get analysis results (elements by page)
  .get(
    "/results",
    requireAuth,
    requireProjectAccess(),
    async (c) => {
      const projectId = c.req.param("projectId");

      const pages = await prisma.element.groupBy({
        by: ["pageUrl"],
        where: { projectId },
        _count: { id: true },
      });

      const elementsByPage = await Promise.all(
        pages.map(async (page) => {
          const elements = await prisma.element.findMany({
            where: { projectId, pageUrl: page.pageUrl },
            orderBy: { confidence: "desc" },
            take: 50,
          });

          return {
            pageUrl: page.pageUrl,
            elementCount: page._count.id,
            elements: elements.map((e) => ({
              id: e.id,
              name: e.name,
              type: e.type,
              selector: e.selector,
              currentValue: e.currentValue?.slice(0, 200),
              confidence: e.confidence,
            })),
          };
        })
      );

      return c.json({ pages: elementsByPage });
    }
  )

  // Cancel running analysis
  .post(
    "/cancel",
    requireAuth,
    requireProjectAccess("admin"),
    async (c) => {
      const projectId = c.req.param("projectId");

      // Find and cancel running job
      const job = await prisma.analysisJob.findFirst({
        where: {
          projectId,
          status: { in: ["queued", "running"] },
        },
      });

      if (!job) {
        return c.json({ error: "No running analysis to cancel" }, 404);
      }

      await prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error: "Cancelled by user",
          completedAt: new Date(),
        },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { status: "ready" },
      });

      return c.json({
        success: true,
        message: "Analysis cancelled",
        jobId: job.id,
      });
    }
  );
