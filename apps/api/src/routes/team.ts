import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../db";
import { inviteTeamMemberSchema, updateTeamMemberSchema } from "../lib/schemas";
import { z } from "zod";
import { requireAuth, requireProjectAccess } from "../middleware/auth";

export const teamRoutes = new Hono()
  // List team members
  .get("/", requireAuth, requireProjectAccess(), async (c) => {
    const projectId = c.req.param("projectId");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        teamMembers: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
            inviter: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    return c.json(
      {
        owner: { ...project.user, role: "owner" },
        members: project.teamMembers.map((m) => ({
          id: m.id,
          user: m.user,
          role: m.role,
          invitedBy: m.inviter,
          createdAt: m.createdAt.toISOString(),
        })),
      },
      200
    );
  })

  // Invite team member
  .post(
    "/invite",
    requireAuth,
    requireProjectAccess("admin"),
    zValidator("json", inviteTeamMemberSchema),
    async (c) => {
      const projectId = c.req.param("projectId");
      const currentUser = c.get("user");
      const input = c.req.valid("json");

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        return c.json({ error: "User not found. They must sign up first." }, 404);
      }

      // Check if already a member
      const existing = await prisma.teamMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: user.id },
        },
      });

      if (existing) {
        return c.json({ error: "User is already a team member" }, 409);
      }

      // Check if user is the owner
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (project?.userId === user.id) {
        return c.json({ error: "Cannot add owner as team member" }, 400);
      }

      const member = await prisma.teamMember.create({
        data: {
          projectId,
          userId: user.id,
          role: input.role,
          invitedBy: currentUser.id,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      return c.json(
        {
          member: {
            id: member.id,
            user: member.user,
            role: member.role,
            createdAt: member.createdAt.toISOString(),
          },
        },
        201
      );
    }
  )

  // Update team member role
  .patch(
    "/:memberId",
    requireAuth,
    requireProjectAccess("admin"),
    zValidator("json", updateTeamMemberSchema),
    async (c) => {
      const projectId = c.req.param("projectId");
      const memberId = c.req.param("memberId");
      const input = c.req.valid("json");

      const member = await prisma.teamMember.findFirst({
        where: { id: memberId, projectId },
      });

      if (!member) {
        return c.json({ error: "Team member not found" }, 404);
      }

      const updated = await prisma.teamMember.update({
        where: { id: memberId },
        data: { role: input.role },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      return c.json(
        {
          member: {
            id: updated.id,
            user: updated.user,
            role: updated.role,
            updatedAt: updated.updatedAt.toISOString(),
          },
        },
        200
      );
    }
  )

  // Remove team member
  .delete(
    "/:memberId",
    requireAuth,
    requireProjectAccess("admin"),
    async (c) => {
      const projectId = c.req.param("projectId");
      const memberId = c.req.param("memberId");

      const member = await prisma.teamMember.findFirst({
        where: { id: memberId, projectId },
      });

      if (!member) {
        return c.json({ error: "Team member not found" }, 404);
      }

      await prisma.teamMember.delete({ where: { id: memberId } });

      return c.json({ success: true, deletedId: memberId }, 200);
    }
  );

