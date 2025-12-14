import { Hono } from "hono";
import { prisma } from "../db";
import { exchangeCodeForToken, getGitHubUser } from "../services/github";

export const githubRoutes = new Hono()
  // Handle GitHub OAuth callback (single callback URL for all orgs)
  .get("/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (!code) {
      return c.redirect(`${frontendUrl}/dashboard/settings?error=no_code`);
    }

    if (!state) {
      return c.redirect(`${frontendUrl}/dashboard/settings?error=invalid_state`);
    }

    // Decode orgId from state
    let orgId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
      orgId = decoded.orgId;
      if (!orgId) throw new Error("Missing orgId");
    } catch {
      return c.redirect(`${frontendUrl}/dashboard/settings?error=invalid_state`);
    }

    try {
      // Exchange code for access token
      const accessToken = await exchangeCodeForToken(code);

      // Get GitHub user info
      const githubUser = await getGitHubUser(accessToken);

      // Update organization with GitHub connection
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          githubAccessToken: accessToken,
          githubOrgName: githubUser.login,
        },
      });

      return c.redirect(`${frontendUrl}/dashboard/settings?github=connected`);
    } catch (error) {
      console.error("GitHub OAuth error:", error);
      const message = error instanceof Error ? error.message : "connection_failed";
      return c.redirect(
        `${frontendUrl}/dashboard/settings?error=${encodeURIComponent(message)}`
      );
    }
  });

