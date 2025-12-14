import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../db";
import { z } from "zod";
import { requireAuth, requireProjectAccess } from "../middleware/auth";
import { RATE_LIMIT_ANALYSIS_PER_HOUR } from "../lib/constants";
import { analyzeRepository } from "../ai";

const triggerAnalysisSchema = z.object({
  fullRescan: z.boolean().default(false),
  pageUrls: z.array(z.string().url()).optional(),
});

export const analysisRoutes = new Hono()
  // Get analysis status
  .get("/status", requireAuth, requireProjectAccess(), async (c) => {
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

    return c.json(
      {
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
      },
      200
    );
  })

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
          {
            error:
              "Rate limit exceeded. Please wait before triggering another analysis.",
          },
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

      // Get project with organization details
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          organization: true,
        },
      });

      if (!project) {
        return c.json({ error: "Project not found" }, 404);
      }

      if (!project.organization.githubAccessToken) {
        return c.json(
          { error: "GitHub not connected to organization" },
          400
        );
      }

      // Create new analysis job
      const job = await prisma.analysisJob.create({
        data: {
          projectId,
          status: "running",
          startedAt: new Date(),
        },
      });

      // Update project status
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "analyzing" },
      });

      // Run the analysis in the background (don't await)
      runAnalysis(
        job.id,
        projectId,
        project.githubRepo,
        project.githubBranch,
        project.rootPath,
        project.organization.githubAccessToken
      ).catch((error) => {
        console.error("Analysis failed:", error);
      });

      return c.json(
        {
          jobId: job.id,
          status: "running",
          message: "Analysis started",
        },
        201
      );
    }
  )

  // Get analysis results (elements by page)
  .get("/results", requireAuth, requireProjectAccess(), async (c) => {
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

    return c.json({ pages: elementsByPage }, 200);
  })

  // Cancel running analysis
  .post("/cancel", requireAuth, requireProjectAccess("admin"), async (c) => {
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

    return c.json(
      {
        success: true,
        message: "Analysis cancelled",
        jobId: job.id,
      },
      200
    );
  });

// Background analysis function
async function runAnalysis(
  jobId: string,
  projectId: string,
  githubRepo: string,
  branch: string,
  rootPath: string,
  accessToken: string
) {
  const [owner, repo] = githubRepo.split("/");

  try {
    const pathInfo = rootPath ? ` (path: ${rootPath})` : "";
    console.log(`\n🔍 Starting analysis for ${githubRepo}${pathInfo}...`);

    // Call the AI analysis
    const result = await analyzeRepository({
      accessToken,
      owner,
      repo,
      branch,
      rootPath,
    });

    console.log(
      `✅ Analysis complete: found ${result.elements.length} elements in ${result.filesAnalyzed.length} files`
    );

    // Log the first few elements for debugging
    if (result.elements.length > 0) {
      console.log("📝 Sample elements:");
      result.elements.slice(0, 3).forEach((el, i) => {
        console.log(`  ${i + 1}. [${el.type}] ${el.name}: "${el.currentValue?.slice(0, 50)}..."`);
      });
    }

    // Clear existing elements for this project (if doing a full rescan)
    console.log("🗑️ Clearing existing elements...");
    await prisma.element.deleteMany({
      where: { projectId },
    });

    // Map analysis types to valid ElementType enum values
    const mapToElementType = (type: string): string => {
      if (type.startsWith("heading")) return "heading";
      if (type === "paragraph") return "paragraph";
      if (type === "button") return "button";
      if (type === "link") return "link";
      if (type === "image-alt") return "image";
      if (type === "text") return "text";
      if (type === "attribute") return "text";
      return "custom";
    };

    // Save the elements to the database
    if (result.elements.length > 0) {
      console.log(`💾 Saving ${result.elements.length} elements to database...`);
      const createResult = await prisma.element.createMany({
        data: result.elements.map((el) => ({
          projectId,
          name: el.name,
          type: mapToElementType(el.type) as any,
          sourceFile: el.filePath,
          sourceLine: el.line,
          currentValue: el.currentValue,
          confidence: el.confidence,
          pageUrl: el.filePath, // Use file path as page URL for now
        })),
      });
      console.log(`✅ Saved ${createResult.count} elements to database`);
    } else {
      console.log("⚠️ No elements to save");
    }

    // Update job status
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        completedAt: new Date(),
        progress: 100,
      },
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "ready",
        lastAnalyzedAt: new Date(),
        analysisError: null,
      },
    });
  } catch (error) {
    console.error(`❌ Analysis failed for ${githubRepo}:`, error);

    // Update job with error
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "error",
        analysisError: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}
