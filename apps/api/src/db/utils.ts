import { prisma } from "./client";
import type { Prisma } from "@prisma/client";

// Pagination helper
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function paginate<T, A extends Prisma.Args<T, "findMany">>(
  model: {
    findMany: (args: A) => Promise<T[]>;
    count: (args: { where?: A["where"] }) => Promise<number>;
  },
  args: A,
  { page = 1, limit = 20 }: PaginationParams
): Promise<PaginatedResult<Awaited<ReturnType<typeof model.findMany>>[number]>> {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      ...args,
      skip,
      take: limit,
    } as A),
    model.count({ where: args.where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Session helpers
export async function createSession(userId: string, expiresInDays = 7) {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return session;
}

export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session;
}

export async function deleteSession(token: string) {
  await prisma.session.delete({ where: { token } }).catch(() => null);
}

// Clean up expired sessions
export async function cleanupExpiredSessions() {
  await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}

// Project access helpers
export async function checkProjectAccess(
  projectId: string,
  userId: string,
  requiredRole?: "owner" | "admin" | "editor" | "viewer"
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
      teamMembers: {
        where: { userId },
      },
    },
  });

  if (!project) return null;

  // Check organization membership
  const orgMember = project.organization.members[0];
  if (!orgMember) return null;

  // Org owners have full access
  if (orgMember.role === "owner") {
    return { project, role: "owner" as const };
  }

  // Org admins have admin access
  if (orgMember.role === "admin") {
    return { project, role: "admin" as const };
  }

  // Check project-specific team membership
  const teamMember = project.teamMembers[0];
  const effectiveRole = teamMember?.role || "viewer";

  // Check role hierarchy if required
  if (requiredRole) {
    const roleHierarchy = ["viewer", "editor", "admin", "owner"];
    const userRoleIndex = roleHierarchy.indexOf(effectiveRole);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

    if (userRoleIndex < requiredRoleIndex) {
      return null;
    }
  }

  return { project, role: effectiveRole };
}

