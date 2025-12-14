import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { prisma } from "../db";
import { requireAuth, getCurrentUser, getCurrentOrg } from "../middleware/auth";

export const authRoutes = new Hono()
  // Get current user info
  .get("/me", requireAuth, async (c) => {
    const user = getCurrentUser(c);
    const org = getCurrentOrg(c);

    return c.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        organization: org
          ? {
              id: org.id,
              name: org.name,
              slug: org.slug,
              role: org.role,
              hasGitHubConnected: !!org.githubAccessToken,
            }
          : null,
      },
      200
    );
  })

  // Sync user profile from Clerk
  .post("/sync", requireAuth, async (c) => {
    const auth = getAuth(c);
    const user = getCurrentUser(c);

    // Get user data from request body (sent from frontend after Clerk provides it)
    const body = await c.req.json().catch(() => ({}));

    if (body.email || body.name || body.avatarUrl) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: body.email || user.email,
          name: body.name ?? user.name,
          avatarUrl: body.avatarUrl ?? user.avatarUrl,
        },
      });
    }

    return c.json({ success: true }, 200);
  });
