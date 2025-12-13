import { GITHUB_API_VERSION } from "../lib/constants";

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
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("File not found");
    }
    throw new Error("Failed to get file content");
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

