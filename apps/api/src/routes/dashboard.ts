import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../db";
import { requireAuth, getCurrentUser } from "../middleware/auth";

// Helper to get organization
async function getOrgWithAccess(userId: string, clerkOrgId: string | null | undefined) {
  if (!clerkOrgId) {
    throw new HTTPException(400, { message: "Organization context required" });
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!org) {
    throw new HTTPException(404, { message: "Organization not found" });
  }

  if (org.members.length === 0) {
    throw new HTTPException(403, { message: "Not a member of this organization" });
  }

  return org;
}

export const dashboardRoutes = new Hono()
  // Get dashboard stats
  .get("/stats", requireAuth, async (c) => {
    const user = getCurrentUser(c);
    const auth = getAuth(c);

    const org = await getOrgWithAccess(user.id, auth?.orgId);

    // Fetch all stats in parallel
    const [
      projectCount,
      elementCount,
      sectionCount,
      pullRequestCount,
      recentProjects,
      recentPullRequests,
      projectsByStatus,
    ] = await Promise.all([
      // Total projects
      prisma.project.count({
        where: { organizationId: org.id },
      }),
      // Total elements across all projects
      prisma.element.count({
        where: {
          project: { organizationId: org.id },
        },
      }),
      // Total sections
      prisma.section.count({
        where: {
          project: { organizationId: org.id },
        },
      }),
      // Total PRs
      prisma.pullRequest.count({
        where: {
          project: { organizationId: org.id },
        },
      }),
      // Recent projects with stats
      prisma.project.findMany({
        where: { organizationId: org.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          _count: {
            select: {
              elements: true,
              sections: true,
              pullRequests: true,
            },
          },
        },
      }),
      // Recent PRs
      prisma.pullRequest.findMany({
        where: {
          project: { organizationId: org.id },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          project: {
            select: { name: true, githubRepo: true },
          },
          user: {
            select: { name: true, avatarUrl: true },
          },
        },
      }),
      // Projects grouped by status
      prisma.project.groupBy({
        by: ["status"],
        where: { organizationId: org.id },
        _count: { status: true },
      }),
    ]);

    // Transform projects by status into a map
    const statusCounts = projectsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return c.json({
      stats: {
        totalProjects: projectCount,
        totalElements: elementCount,
        totalSections: sectionCount,
        totalPullRequests: pullRequestCount,
        projectsByStatus: statusCounts,
      },
      recentProjects: recentProjects.map((p) => ({
        id: p.id,
        name: p.name,
        githubRepo: p.githubRepo,
        githubBranch: p.githubBranch,
        deploymentUrl: p.deploymentUrl,
        status: p.status,
        lastAnalyzedAt: p.lastAnalyzedAt?.toISOString() || null,
        updatedAt: p.updatedAt.toISOString(),
        counts: {
          elements: p._count.elements,
          sections: p._count.sections,
          pullRequests: p._count.pullRequests,
        },
      })),
      recentPullRequests: recentPullRequests.map((pr) => ({
        id: pr.id,
        title: pr.title,
        status: pr.status,
        githubPrUrl: pr.githubPrUrl,
        githubPrNumber: pr.githubPrNumber,
        createdAt: pr.createdAt.toISOString(),
        mergedAt: pr.mergedAt?.toISOString() || null,
        project: pr.project,
        user: pr.user,
      })),
      organization: {
        id: org.id,
        name: org.name,
        hasGitHubConnected: !!org.githubAccessToken,
        githubOrgName: org.githubOrgName,
      },
    }, 200);
  });
