import { GITHUB_API_VERSION } from "../lib/constants";
import * as crypto from "crypto";

// GitHub API types
interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  content: string;
  encoding: string;
}

interface GitHubCreatePRResponse {
  number: number;
  html_url: string;
  state: string;
  title: string;
}

// GitHub OAuth helpers
export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth credentials not configured");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = (await response.json()) as GitHubTokenResponse;

  if (data.error || !data.access_token) {
    throw new Error(data.error_description || "Failed to get access token");
  }

  return data.access_token;
}

export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get GitHub user");
  }

  return response.json() as Promise<GitHubUser>;
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });

  if (!response.ok) {
    return null;
  }

  const emails = (await response.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;

  const primaryEmail = emails.find((e) => e.primary && e.verified);
  return primaryEmail?.email || emails[0]?.email || null;
}

// Repository helpers
export async function getRepository(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubRepo> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Repository not found or no access");
    }
    throw new Error("Failed to get repository");
  }

  return response.json() as Promise<GitHubRepo>;
}

export async function getUserRepositories(
  accessToken: string,
  page = 1,
  perPage = 30
): Promise<GitHubRepo[]> {
  const response = await fetch(
    `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get repositories");
  }

  return response.json() as Promise<GitHubRepo[]>;
}

// File operations
export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref = "main"
): Promise<GitHubFileContent> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`GitHub getFileContent failed:`, {
      status: response.status,
      statusText: response.statusText,
      url,
      ref,
      error: errorBody,
    });

    if (response.status === 404) {
      throw new Error(`File not found: ${path} (ref: ${ref})`);
    }
    if (response.status === 401) {
      throw new Error(`GitHub auth failed - token may be expired`);
    }
    if (response.status === 403) {
      throw new Error(`GitHub access denied - check repo permissions`);
    }
    throw new Error(`GitHub API error ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  return response.json() as Promise<GitHubFileContent>;
}

export function decodeFileContent(content: string): string {
  return Buffer.from(content, "base64").toString("utf-8");
}

// Branch operations
export async function createBranch(
  accessToken: string,
  owner: string,
  repo: string,
  branchName: string,
  fromRef: string
): Promise<void> {
  // Get the SHA of the source branch
  const refResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${fromRef}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    }
  );

  if (!refResponse.ok) {
    throw new Error("Failed to get source branch");
  }

  const refData = (await refResponse.json()) as { object: { sha: string } };

  // Create new branch
  const createResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      }),
    }
  );

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(`Failed to create branch: ${JSON.stringify(error)}`);
  }
}

// Commit and file update
export async function updateFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string
): Promise<void> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString("base64"),
        branch,
        sha,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update file: ${JSON.stringify(error)}`);
  }
}

// Pull request operations
export async function createPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string
): Promise<GitHubCreatePRResponse> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        head,
        base,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create pull request: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<GitHubCreatePRResponse>;
}

export async function getPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<GitHubCreatePRResponse & { merged: boolean; mergeable: boolean | null }> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get pull request");
  }

  return response.json() as Promise<
    GitHubCreatePRResponse & { merged: boolean; mergeable: boolean | null }
  >;
}

// Search code
export async function searchCode(
  accessToken: string,
  owner: string,
  repo: string,
  query: string
): Promise<Array<{ path: string; sha: string }>> {
  const response = await fetch(
    `https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${owner}/${repo}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Code search failed");
  }

  const data = (await response.json()) as {
    items: Array<{ path: string; sha: string }>;
  };

  return data.items;
}

// ============================================
// GitHub App Authentication
// ============================================

/**
 * Create a JWT for GitHub App authentication
 * Used to authenticate as the GitHub App itself
 */
function createGitHubAppJWT(): string {
  const appId = process.env.GITHUB_APP_ID;
  let privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error("GitHub App credentials not configured (GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY)");
  }

  // Handle different formats of private key storage in env
  // Replace literal \n with actual newlines
  privateKey = privateKey.replace(/\\n/g, "\n");

  // Remove surrounding quotes if present
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // Issued 60 seconds ago (clock drift)
    exp: now + 600, // Expires in 10 minutes
    iss: appId,
  };

  // Create JWT header
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  // Sign with private key
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, "base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Get an installation access token for a specific installation
 * This token is used to make API calls on behalf of the app for that installation
 */
export async function getInstallationToken(installationId: string): Promise<string> {
  const jwt = createGitHubAppJWT();

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to get installation token:", error);
    throw new Error(`Failed to get installation token: ${response.status}`);
  }

  const data = (await response.json()) as { token: string; expires_at: string };
  return data.token;
}

/**
 * Get repositories accessible to a GitHub App installation
 */
export async function getInstallationRepositories(
  installationId: string
): Promise<Array<{
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}>> {
  const token = await getInstallationToken(installationId);

  const response = await fetch(
    "https://api.github.com/installation/repositories?per_page=100",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get installation repositories");
  }

  const data = (await response.json()) as {
    repositories: Array<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      default_branch: string;
      html_url: string;
    }>;
  };

  return data.repositories;
}

/**
 * Get the GitHub App installation URL for a user to install the app
 */
export function getAppInstallationUrl(state?: string): string {
  const appSlug = process.env.GITHUB_APP_SLUG || "loomii";
  let url = `https://github.com/apps/${appSlug}/installations/new`;
  if (state) {
    url += `?state=${encodeURIComponent(state)}`;
  }
  return url;
}

