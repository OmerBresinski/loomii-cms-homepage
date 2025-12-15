import { z } from "zod";
import { generateText } from "ai";
import { logger } from "../logger";

const MODEL = "xai/grok-code-fast-1";

// GitHub context type
export interface GitHubContext {
  accessToken: string;
  owner: string;
  repo: string;
  branch: string;
  rootPath?: string; // Root path within the repo for monorepos (e.g., "apps/web")
}

// GitHub API response types
interface GitHubTreeResponse {
  tree: Array<{ path: string; type: string }>;
}

interface GitHubContentResponse {
  name: string;
  path: string;
  type: string;
  content?: string;
  sha?: string;
}

interface GitHubSearchResponse {
  items: Array<{ path: string; sha: string }>;
}

interface GitHubRefResponse {
  object: { sha: string };
}

interface GitHubPRResponse {
  number: number;
  html_url: string;
}

// GitHub API helper with generic type
async function githubFetch<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// Tool schemas - Note: Gemini doesn't support .default() values, so all fields must be explicit
export const listFilesSchema = z.object({
  path: z.string().describe("Path to list (empty string for root)"),
  recursive: z.boolean().describe("Whether to list recursively"),
});

export const readFileSchema = z.object({
  path: z.string().describe("Path to the file in the repository"),
});

export const searchCodeSchema = z.object({
  query: z.string().describe("The code or text to search for"),
  fileType: z
    .string()
    .describe(
      "File extension to filter by (e.g., tsx, ts, jsx). Use empty string for all files."
    ),
});

export const analyzeSourceFileSchema = z.object({
  path: z.string().describe("Path to the source file to analyze"),
});

export const generateDiffSchema = z.object({
  filePath: z.string().describe("Path to the file to modify"),
  oldContent: z.string().describe("The exact content to find and replace"),
  newContent: z.string().describe("The new content to insert"),
});

export const commitChangesSchema = z.object({
  branchName: z.string().describe("Name for the new branch"),
  title: z.string().describe("Title of the pull request"),
  description: z.string().describe("Description of the pull request"),
  changes: z
    .array(
      z.object({
        filePath: z.string().describe("Path to the file"),
        content: z.string().describe("New content for the file"),
      })
    )
    .describe("Files to create or modify"),
});

// Tool definitions for AI SDK
export const toolDefinitions = {
  listFiles: {
    description:
      "List files and directories in a path of the GitHub repository. Use this to explore the project structure.",
    parameters: listFilesSchema,
  },
  readFile: {
    description: "Read the contents of a file from the GitHub repository.",
    parameters: readFileSchema,
  },
  searchCode: {
    description:
      "Search for code patterns in the repository to find where content is defined.",
    parameters: searchCodeSchema,
  },
  analyzeSourceFile: {
    description: `Analyze a source file to extract editable content. 
      Parses JSX/TSX files to find text content, headings, paragraphs, 
      button labels, image alt text, and other user-facing strings.`,
    parameters: analyzeSourceFileSchema,
  },
  generateDiff: {
    description: "Generate a diff for replacing content in a file.",
    parameters: generateDiffSchema,
  },
  commitChanges: {
    description:
      "Commit file changes to a new branch and create a pull request.",
    parameters: commitChangesSchema,
  },
};

// Tool executors
export function createToolExecutors(ctx: GitHubContext) {
  return {
    async listFiles(
      params: z.infer<typeof listFilesSchema>
    ): Promise<Array<{ name: string; path: string; type: string }>> {
      const { path, recursive } = params;
      const startTime = Date.now();
      logger.tool.call("listFiles", { path, recursive });

      try {
        let result: Array<{ name: string; path: string; type: string }>;
        if (recursive) {
          const data = await githubFetch<GitHubTreeResponse>(
            ctx.accessToken,
            `/repos/${ctx.owner}/${ctx.repo}/git/trees/${ctx.branch}?recursive=1`
          );

          result = data.tree
            .filter((item) => !path || item.path.startsWith(path))
            .slice(0, 100)
            .map((item) => ({
              name: item.path.split("/").pop() || "",
              path: item.path,
              type: item.type === "blob" ? "file" : "dir",
            }));
        } else {
          const endpoint = path
            ? `/repos/${ctx.owner}/${ctx.repo}/contents/${path}?ref=${ctx.branch}`
            : `/repos/${ctx.owner}/${ctx.repo}/contents?ref=${ctx.branch}`;

          const data = await githubFetch<
            GitHubContentResponse | GitHubContentResponse[]
          >(ctx.accessToken, endpoint);
          const items = Array.isArray(data) ? data : [data];

          result = items.map((item) => ({
            name: item.name,
            path: item.path,
            type: item.type === "file" ? "file" : "dir",
          }));
        }

        logger.tool.result("listFiles", Date.now() - startTime, result);
        return result;
      } catch (error) {
        logger.tool.error("listFiles", error as Error);
        throw error;
      }
    },

    async readFile(
      params: z.infer<typeof readFileSchema>
    ): Promise<{ path: string; length: number; preview: string }> {
      const { path } = params;
      const startTime = Date.now();
      logger.tool.call("readFile", { path });

      try {
        const data = await githubFetch<GitHubContentResponse>(
          ctx.accessToken,
          `/repos/${ctx.owner}/${ctx.repo}/contents/${path}?ref=${ctx.branch}`
        );

        if (!data.content) {
          throw new Error("File has no content");
        }

        const content = Buffer.from(data.content, "base64").toString("utf-8");
        const result = {
          path,
          length: content.length,
          preview: content.slice(0, 200),
        };

        logger.tool.result("readFile", Date.now() - startTime, result);
        return result;
      } catch (error) {
        logger.tool.error("readFile", error as Error);
        throw error;
      }
    },

    async searchCode(
      params: z.infer<typeof searchCodeSchema>
    ): Promise<Array<{ path: string; sha: string }>> {
      const { query, fileType } = params;
      const startTime = Date.now();
      logger.tool.call("searchCode", { query, fileType });

      try {
        let searchQuery = `${query} repo:${ctx.owner}/${ctx.repo}`;
        if (fileType && fileType.length > 0) {
          searchQuery += ` extension:${fileType}`;
        }

        const data = await githubFetch<GitHubSearchResponse>(
          ctx.accessToken,
          `/search/code?q=${encodeURIComponent(searchQuery)}&per_page=10`
        );

        const result = data.items.map((item) => ({
          path: item.path,
          sha: item.sha,
        }));

        logger.tool.result("searchCode", Date.now() - startTime, result);
        return result;
      } catch (error) {
        logger.tool.error("searchCode", error as Error);
        throw error;
      }
    },

    async analyzeSourceFile(params: z.infer<typeof analyzeSourceFileSchema>) {
      const { path } = params;
      const startTime = Date.now();
      logger.tool.call("analyzeSourceFile", { path });

      try {
        const data = await githubFetch<GitHubContentResponse>(
          ctx.accessToken,
          `/repos/${ctx.owner}/${ctx.repo}/contents/${path}?ref=${ctx.branch}`
        );

        if (!data.content) {
          throw new Error("File has no content");
        }

        const content = Buffer.from(data.content, "base64").toString("utf-8");
        const lines = content.split("\n");

        // Add line numbers to content for AI reference
        const numberedContent = lines
          .map((line, idx) => `${idx + 1}|${line}`)
          .join("\n");

        // For large files, we need to handle truncation
        const MAX_CONTENT_SIZE = 100000; // 100K chars to handle larger files
        const contentToAnalyze = numberedContent.slice(0, MAX_CONTENT_SIZE);
        const isTruncated = numberedContent.length > MAX_CONTENT_SIZE;

        if (isTruncated) {
          console.log(
            `  ⚠️ File ${path} truncated from ${numberedContent.length} to ${MAX_CONTENT_SIZE} chars`
          );
        }

        console.log(
          `  📄 Analyzing ${path} (${numberedContent.length} chars${isTruncated ? ", truncated" : ""})`
        );

        // Use AI to extract editable content elements
        const prompt = `Analyze this source file and extract ALL editable text content elements.

FILE: ${path}${isTruncated ? " (truncated - analyze what you can see)" : ""}
\`\`\`
${contentToAnalyze}
\`\`\`

Extract every piece of user-facing text content that could be edited by a content manager:
- Headings (h1-h6)
- Paragraphs
- Button text
- Link text (EACH link separately, not grouped together)
- Span text
- Labels
- Placeholders
- Alt text
- Any other visible text

IMPORTANT RULES:
1. Each text element must be SEPARATE - do NOT combine multiple links/buttons/items into one
2. For navigation menus, each menu item is a SEPARATE element
3. Include the exact line number where the text appears
4. Only include actual text content, not code/variables/expressions
5. Skip CSS classes, JavaScript code, and HTML attributes (except alt/placeholder/title text)

Return ONLY a JSON array in this exact format:
[
  { "type": "heading", "content": "Welcome to our site", "line": 15 },
  { "type": "link", "content": "Features", "line": 42 },
  { "type": "link", "content": "How it Works", "line": 45 },
  { "type": "button", "content": "Get Started", "line": 58 },
  { "type": "paragraph", "content": "Some description text here", "line": 72 }
]

Types: heading, paragraph, button, link, text, label, placeholder, alt`;

        const response = await (generateText as any)({
          model: MODEL,
          prompt,
          system: `You are an expert at analyzing HTML/JSX source code to identify editable text content.
Your job is to find every piece of text that a content manager might want to edit.
Be thorough and precise - extract EACH element separately, never combine multiple items.
Return valid JSON only.`,
        });

        let elements: Array<{
          type: string;
          content: string;
          line: number;
          context: string;
        }> = [];

        try {
          const jsonMatch = response.text?.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            elements = parsed.map((el: any) => ({
              type: el.type || "text",
              content: el.content || "",
              line: el.line || 1,
              context: lines[Math.max(0, (el.line || 1) - 1)]?.trim() || "",
            }));
          }
        } catch (parseError) {
          console.log(`  Warning: Failed to parse AI response for ${path}`);
        }

        // Filter out invalid elements
        elements = elements.filter(
          (el) =>
            el.content &&
            el.content.length >= 2 &&
            el.content.length <= 500 &&
            !/^[\s\d.,!?;:]+$/.test(el.content)
        );

        const result = {
          path,
          elementsFound: elements.length,
          elements,
        };
        logger.tool.result("analyzeSourceFile", Date.now() - startTime, result);
        return result;
      } catch (error) {
        logger.tool.error("analyzeSourceFile", error as Error);
        throw error;
      }
    },

    async generateDiff(params: z.infer<typeof generateDiffSchema>) {
      const { filePath, oldContent, newContent } = params;
      const startTime = Date.now();
      logger.tool.call("generateDiff", { filePath, oldContent, newContent });

      try {
        const oldLines = oldContent.split("\n");
        const newLines = newContent.split("\n");

        let unified = `--- a/${filePath}\n+++ b/${filePath}\n`;
        unified += `@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;

        for (const line of oldLines) {
          unified += `-${line}\n`;
        }
        for (const line of newLines) {
          unified += `+${line}\n`;
        }

        const result = {
          filePath,
          oldContent,
          newContent,
          unified,
        };

        logger.tool.result("generateDiff", Date.now() - startTime, result);
        return result;
      } catch (error) {
        logger.tool.error("generateDiff", error as Error);
        throw error;
      }
    },

    async commitChanges(params: z.infer<typeof commitChangesSchema>) {
      const { branchName, title, description, changes } = params;
      const startTime = Date.now();
      logger.tool.call("commitChanges", {
        branchName,
        title,
        changesCount: changes.length,
      });

      try {
        // Get base branch SHA
        const refData = await githubFetch<GitHubRefResponse>(
          ctx.accessToken,
          `/repos/${ctx.owner}/${ctx.repo}/git/ref/heads/${ctx.branch}`
        );
        const baseSha = refData.object.sha;

        // Create new branch
        await githubFetch<unknown>(
          ctx.accessToken,
          `/repos/${ctx.owner}/${ctx.repo}/git/refs`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ref: `refs/heads/${branchName}`,
              sha: baseSha,
            }),
          }
        );

        // Commit each file change
        for (const change of changes) {
          let fileSha: string | undefined;
          try {
            const fileData = await githubFetch<GitHubContentResponse>(
              ctx.accessToken,
              `/repos/${ctx.owner}/${ctx.repo}/contents/${change.filePath}?ref=${branchName}`
            );
            fileSha = fileData.sha;
          } catch {
            // File doesn't exist
          }

          await githubFetch<unknown>(
            ctx.accessToken,
            `/repos/${ctx.owner}/${ctx.repo}/contents/${change.filePath}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: `Update ${change.filePath}`,
                content: Buffer.from(change.content).toString("base64"),
                branch: branchName,
                sha: fileSha,
              }),
            }
          );
        }

        // Create pull request
        const prData = await githubFetch<GitHubPRResponse>(
          ctx.accessToken,
          `/repos/${ctx.owner}/${ctx.repo}/pulls`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              body: description,
              head: branchName,
              base: ctx.branch,
            }),
          }
        );

        const result = {
          pullRequest: {
            number: prData.number,
            url: prData.html_url,
          },
        };

        logger.tool.result("commitChanges", Date.now() - startTime, result);
        return result;
      } catch (error) {
        logger.tool.error("commitChanges", error as Error);
        throw error;
      }
    },
  };
}

export type ToolExecutors = ReturnType<typeof createToolExecutors>;
