import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, getCurrentUser } from "../middleware/auth";
import {
  exchangeCodeForToken,
  getGitHubUser,
  getUserEmail,
} from "../services/github";

const githubLinkSchema = z.object({
  code: z.string(),
});

export const authRoutes = new Hono()
  // Get current user info
  .get("/me", requireAuth, async (c) => {
    const user = getCurrentUser(c);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        hasGitHubLinked: !!user.githubAccessToken,
      },
    });
  })

  // Initiate GitHub OAuth flow for linking GitHub account (not for auth)
  .get("/github/link", requireAuth, async (c) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return c.json({ error: "GitHub OAuth not configured" }, 500);
    }

    const redirectUri = `${process.env.API_URL || "http://localhost:3001"}/auth/github/callback`;
    const scope = "read:user user:email repo";
    const state = crypto.randomUUID();

    // In production, store state in a short-lived cache for CSRF protection

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);

    return c.json({ url: authUrl.toString(), state });
  })

  // Handle GitHub OAuth callback for linking
  .get("/github/callback", async (c) => {
    const code = c.req.query("code");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (!code) {
      return c.redirect(`${frontendUrl}/settings?error=no_code`);
    }

    try {
      // Exchange code for access token
      const accessToken = await exchangeCodeForToken(code);

      // Get user info from GitHub
      const githubUser = await getGitHubUser(accessToken);

      // Get user email if not public
      let email = githubUser.email;
      if (!email) {
        email = await getUserEmail(accessToken);
      }

      // Store the GitHub token temporarily - user will link it on the frontend
      // We redirect with a success indicator, and the frontend will call the link endpoint
      return c.redirect(
        `${frontendUrl}/settings/github?github_id=${githubUser.id}&github_token=${encodeURIComponent(accessToken)}`
      );
    } catch (error) {
      console.error("GitHub OAuth error:", error);
      const message = error instanceof Error ? error.message : "link_failed";
      return c.redirect(
        `${frontendUrl}/settings?error=${encodeURIComponent(message)}`
      );
    }
  })

  // Link GitHub account to current user
  .post(
    "/github/link",
    requireAuth,
    zValidator(
      "json",
      z.object({
        githubId: z.string(),
        accessToken: z.string(),
      })
    ),
    async (c) => {
      const user = getCurrentUser(c);
      const { githubId, accessToken } = c.req.valid("json");

      // Verify the token is valid
      try {
        const githubUser = await getGitHubUser(accessToken);
        if (String(githubUser.id) !== githubId) {
          return c.json({ error: "Invalid GitHub credentials" }, 400);
        }

        // Update user with GitHub info
        await prisma.user.update({
          where: { id: user.id },
          data: {
            githubId,
            githubAccessToken: accessToken,
            avatarUrl: user.avatarUrl || githubUser.avatar_url,
            name: user.name || githubUser.name,
          },
        });

        return c.json({ success: true });
      } catch (error) {
        console.error("GitHub link error:", error);
        return c.json({ error: "Failed to link GitHub account" }, 500);
      }
    }
  )

  // Unlink GitHub account
  .delete("/github/link", requireAuth, async (c) => {
    const user = getCurrentUser(c);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        githubId: null,
        githubAccessToken: null,
      },
    });

    return c.json({ success: true });
  });
