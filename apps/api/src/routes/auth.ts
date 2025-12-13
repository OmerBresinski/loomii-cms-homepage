import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma, createSession } from "../db";
import { SESSION_MAX_AGE_SECONDS } from "../lib/constants";
import {
  exchangeCodeForToken,
  getGitHubUser,
  getUserEmail,
} from "../services/github";
import {
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
} from "../middleware/auth";

const githubCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

export const authRoutes = new Hono()
  // Get current user session
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user");

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  })

  // Initiate GitHub OAuth flow
  .get("/github", async (c) => {
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

  // Handle GitHub OAuth callback
  .get(
    "/github/callback",
    zValidator("query", githubCallbackSchema),
    async (c) => {
      const { code } = c.req.valid("query");
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

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

        if (!email) {
          return c.redirect(`${frontendUrl}/auth/error?message=no_email`);
        }

        // Upsert user in database
        const user = await prisma.user.upsert({
          where: { githubId: String(githubUser.id) },
          create: {
            email,
            name: githubUser.name,
            avatarUrl: githubUser.avatar_url,
            githubId: String(githubUser.id),
            githubAccessToken: accessToken,
          },
          update: {
            email,
            name: githubUser.name,
            avatarUrl: githubUser.avatar_url,
            githubAccessToken: accessToken,
          },
        });

        // Create session
        const session = await createSession(user.id);

        // Set cookie and redirect
        c.header("Set-Cookie", setSessionCookie(session.token, SESSION_MAX_AGE_SECONDS));
        return c.redirect(`${frontendUrl}/dashboard`);
      } catch (error) {
        console.error("GitHub OAuth error:", error);
        const message = error instanceof Error ? error.message : "auth_failed";
        return c.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(message)}`);
      }
    }
  )

  // Logout
  .post("/logout", requireAuth, async (c) => {
    const session = c.get("session");

    // Delete session from database
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null);

    // Clear cookie
    c.header("Set-Cookie", clearSessionCookie());

    return c.json({ success: true });
  });
