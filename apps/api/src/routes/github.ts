import { Hono } from "hono";
import { prisma } from "../db";
import { getInstallationToken } from "../services/github";
import { GITHUB_API_VERSION } from "../lib/constants";

// Shared handler for GitHub App installation callback
async function handleAppCallback(c: any) {
  const installationId = c.req.query("installation_id");
  const state = c.req.query("state");
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!installationId) {
    return c.redirect(`${frontendUrl}/dashboard/settings?error=no_installation`);
  }

  if (!state) {
    return c.redirect(`${frontendUrl}/dashboard/settings?error=invalid_state`);
  }

  let orgId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    orgId = decoded.orgId;
    if (!orgId) throw new Error("Missing orgId");
  } catch {
    return c.redirect(`${frontendUrl}/dashboard/settings?error=invalid_state`);
  }

  try {
    const token = await getInstallationToken(installationId);

    const installationResponse = await fetch(
      `https://api.github.com/installation/repositories?per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": GITHUB_API_VERSION,
        },
      }
    );

    let accountName = "GitHub";
    if (installationResponse.ok) {
      const data = (await installationResponse.json()) as {
        repositories?: Array<{ owner?: { login?: string } }>;
      };
      const firstRepo = data.repositories?.[0];
      if (firstRepo?.owner?.login) {
        accountName = firstRepo.owner.login;
      }
    } else {
      console.error("Failed to fetch installation repos:", await installationResponse.text());
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        githubInstallationId: installationId,
        githubOrgName: accountName,
        githubAccessToken: null,
      },
    });

    console.log(`GitHub App installed for org ${orgId}: installation=${installationId}, account=${accountName}`);

    return c.redirect(`${frontendUrl}/dashboard/settings?github=connected`);
  } catch (error) {
    console.error("GitHub App installation error:", error);
    const message = error instanceof Error ? error.message : "installation_failed";
    return c.redirect(
      `${frontendUrl}/dashboard/settings?error=${encodeURIComponent(message)}`
    );
  }
}

export const githubRoutes = new Hono()
  // Handle GitHub App installation callback at /github/app/callback
  .get("/app/callback", handleAppCallback)
  // Also support /github/callback for backwards compatibility
  .get("/callback", handleAppCallback);

