import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../db";
import { z } from "zod";
import { requireAuth, requireProjectAccess } from "../middleware/auth";
import { RATE_LIMIT_ANALYSIS_PER_HOUR } from "../lib/constants";
import { analyzeRepository } from "../ai";
import { getInstallationToken } from "../services/github";
import { extractGroupTemplate } from "../services/template-extractor";

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
    requireProjectAccess(),
    zValidator("json", triggerAnalysisSchema),
    async (c) => {
      const projectId = c.req.param("projectId")!;
      c.req.valid("json"); // Validate but don't need the input

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

      if (!project.organization.githubInstallationId) {
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
        project.organization.githubInstallationId
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

  // Get list of pages for a project
  .get("/pages", requireAuth, requireProjectAccess(), async (c) => {
    const projectId = c.req.param("projectId");

    // Group elements by pageUrl to get page list with element counts
    const pageGroups = await prisma.element.groupBy({
      by: ["pageUrl"],
      where: { projectId },
      _count: { id: true },
    });

    // Helper to generate concise page name from route
    const generatePageName = (route: string): string => {
      if (route === "/") return "Homepage";

      // Get the last segment of the route
      const segment = route.split("/").filter(Boolean).pop() || "Page";

      // Convert to title case and replace hyphens with spaces
      const name = segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Keep it concise - if too long, truncate
      return name.length > 20 ? name.slice(0, 17) + "..." : name;
    };

    // Sort pages: "/" first, then alphabetically
    const pages = pageGroups
      .map((p) => ({
        pageRoute: p.pageUrl,
        elementCount: p._count.id,
        pageName: generatePageName(p.pageUrl),
      }))
      .sort((a, b) => {
        if (a.pageRoute === "/") return -1;
        if (b.pageRoute === "/") return 1;
        return a.pageRoute.localeCompare(b.pageRoute);
      });

    return c.json({ pages }, 200);
  })

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

// Background analysis function
async function runAnalysis(
  jobId: string,
  projectId: string,
  githubRepo: string,
  branch: string,
  rootPath: string,
  installationId: string
) {
  const [owner, repo] = githubRepo.split("/");

  // Progress callback to update job status in DB
  const updateProgress = async (progress: number, _message: string) => {
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        progress,
        status: "running",
      }
    });
  };

  try {
    const pathInfo = rootPath ? ` (path: ${rootPath})` : "";
    console.log(`\n🔍 Starting analysis for ${githubRepo}${pathInfo}...`);

    // Get installation token for GitHub App
    const accessToken = await getInstallationToken(installationId);

    // Call the AI analysis with progress callback
    const result = await analyzeRepository({
      accessToken,
      owner: owner!,
      repo: repo!,
      branch,
      rootPath,
    }, updateProgress);

    const totalElements = result.sections.reduce(
      (acc, s) => acc + s.elements.length,
      0
    );
    console.log(
      `✅ Analysis complete: found ${result.sections.length} sections with ${totalElements} elements in ${result.filesAnalyzed.length} files`
    );

    // Log sample sections for debugging
    if (result.sections.length > 0) {
      console.log("📝 Sample sections:");
      result.sections.slice(0, 3).forEach((section, i) => {
        console.log(
          `  ${i + 1}. "${section.name}" (${section.elements.length} elements)`
        );
      });
    }

    // Clear existing data for this project (edits cascade from elements)
    console.log("🗑️ Clearing existing sections, elements, groups, and pull requests...");
    await prisma.pullRequest.deleteMany({
      where: { projectId },
    });
    await prisma.element.deleteMany({
      where: { projectId },
    });
    await prisma.elementGroup.deleteMany({
      where: { projectId },
    });
    await prisma.section.deleteMany({
      where: { projectId },
    });

    // Create a mapping from temporary group IDs to real DB IDs
    const groupIdMap = new Map<string, string>();

    // Save element groups first (so we can link elements to them)
    if (result.elementGroups.length > 0) {
      console.log(
        `💾 Saving ${result.elementGroups.length} element groups...`
      );

      for (let i = 0; i < result.elementGroups.length; i++) {
        const group = result.elementGroups[i]!;
        // Progress 95-98% for group saving + template extraction
        const groupProgress = Math.round(95 + ((i / result.elementGroups.length) * 3));
        await updateProgress(groupProgress, `Extracting template: ${group.name}`);

        const createdGroup = await prisma.elementGroup.create({
          data: {
            projectId,
            pageUrl: group.pageRoute,
            name: group.name,
            description: group.description,
            sourceFile: group.sourceFile,
            startLine: group.startLine,
            endLine: group.endLine,
            itemCount: group.itemCount,
            templateCode: "",
            confidence: group.confidence,
          },
        });
        groupIdMap.set(group.id, createdGroup.id);

        // Extract template for this group
        try {
          console.log(`  📋 Extracting template for "${group.name}"...`);
          const template = await extractGroupTemplate({
            accessToken,
            owner: owner!,
            repo: repo!,
            branch,
            sourceFile: group.sourceFile,
            startLine: group.startLine,
            endLine: group.endLine,
            itemCount: group.itemCount,
          });

          if (template) {
            await prisma.elementGroup.update({
              where: { id: createdGroup.id },
              data: {
                templateCode: template.templateCode,
                placeholders: template.placeholders,
              },
            });
            console.log(`  ✅ Template extracted with ${template.placeholders.length} placeholders`);
          }
        } catch (err) {
          console.log(`  ⚠️ Failed to extract template for "${group.name}": ${(err as Error).message}`);
        }
      }

      console.log(`✅ Saved ${result.elementGroups.length} element groups`);
    }

    // Save sections and elements (98-100%)
    if (result.sections.length > 0) {
      await updateProgress(98, "Saving sections and elements");
      console.log(
        `💾 Saving ${result.sections.length} sections with ${totalElements} elements...`
      );

      for (const section of result.sections) {
        // Create section
        const createdSection = await prisma.section.create({
          data: {
            projectId,
            pageUrl: section.pageRoute,
            name: section.name,
            description: section.description,
            sourceFile: section.sourceFile,
            startLine: section.startLine,
            endLine: section.endLine,
          },
        });

        // Create elements for this section
        if (section.elements.length > 0) {
          await prisma.element.createMany({
            data: section.elements.map((el) => ({
              projectId,
              sectionId: createdSection.id,
              // Link to element group if this element belongs to one
              groupId: el.groupId ? groupIdMap.get(el.groupId) : undefined,
              groupIndex: el.groupIndex,
              name: el.name,
              type: mapToElementType(el.type) as any,
              sourceFile: el.filePath,
              sourceLine: el.line,
              currentValue: el.currentValue,
              sourceContext: el.sourceContext,  // 3 lines before/after for diff view
              confidence: el.confidence,
              pageUrl: el.pageRoute,  // Use the detected page route instead of file path
              schema: (el as any).href ? { href: (el as any).href } : undefined,
            })),
          });
        }
      }

      console.log(`✅ Saved all sections and elements to database`);
    } else {
      console.log("⚠️ No sections to save");
    }

    // Update element group section links (find which section each group belongs to)
    if (result.elementGroups.length > 0) {
      for (const group of result.elementGroups) {
        const dbGroupId = groupIdMap.get(group.id);
        if (!dbGroupId) continue;

        // Find the section that contains this group (by file, page, and line range)
        const matchingSection = await prisma.section.findFirst({
          where: {
            projectId,
            sourceFile: group.sourceFile,
            pageUrl: group.pageRoute,
            startLine: { lte: group.startLine },
            endLine: { gte: group.endLine },
          },
        });

        if (matchingSection) {
          await prisma.elementGroup.update({
            where: { id: dbGroupId },
            data: { sectionId: matchingSection.id },
          });
        }
      }
    }

    // Update job status
    await updateProgress(100, "Analysis complete");
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
