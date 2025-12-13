import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// GitHub context that will be provided at runtime
interface GitHubContext {
  octokit: {
    repos: {
      getContent: (params: {
        owner: string;
        repo: string;
        path: string;
        ref?: string;
      }) => Promise<{ data: { content?: string; encoding?: string } }>;
    };
    search: {
      code: (params: {
        q: string;
        per_page?: number;
      }) => Promise<{ data: { items: Array<{ path: string; sha: string }> } }>;
    };
    pulls: {
      create: (params: {
        owner: string;
        repo: string;
        title: string;
        body: string;
        head: string;
        base: string;
      }) => Promise<{ data: { number: number; html_url: string } }>;
    };
  };
  owner: string;
  repo: string;
  branch: string;
}

// Read a file from the repository
export const readFileTool = createTool({
  id: "read-file",
  description: "Read the contents of a file from the connected GitHub repository.",
  inputSchema: z.object({
    path: z.string().describe("Path to the file in the repository"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    content: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { path } = context as unknown as { path: string };
    const runtimeContext = (context as any).runtimeContext;
    const github = runtimeContext?.get("github") as GitHubContext | undefined;
    
    if (!github) {
      return { success: false, error: "GitHub not initialized" };
    }

    try {
      const response = await github.octokit.repos.getContent({
        owner: github.owner,
        repo: github.repo,
        path,
        ref: github.branch,
      });

      if (!response.data.content) {
        return { success: false, error: "File has no content" };
      }

      const content = Buffer.from(response.data.content, "base64").toString("utf-8");
      return { success: true, content };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to read file" 
      };
    }
  },
});

// Search for code in the repository
export const searchCodeTool = createTool({
  id: "search-code",
  description: "Search for code patterns in the repository to find where content is defined.",
  inputSchema: z.object({
    query: z.string().describe("The code or text to search for"),
    fileType: z.string().optional().describe("File extension to filter by (e.g., tsx, ts, jsx)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    results: z.array(z.object({
      path: z.string(),
      sha: z.string(),
    })).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { query, fileType } = context as unknown as { query: string; fileType?: string };
    const runtimeContext = (context as any).runtimeContext;
    const github = runtimeContext?.get("github") as GitHubContext | undefined;
    
    if (!github) {
      return { success: false, error: "GitHub not initialized" };
    }

    try {
      let searchQuery = `${query} repo:${github.owner}/${github.repo}`;
      if (fileType) {
        searchQuery += ` extension:${fileType}`;
      }

      const response = await github.octokit.search.code({
        q: searchQuery,
        per_page: 10,
      });

      const results = response.data.items.map(item => ({
        path: item.path,
        sha: item.sha,
      }));

      return { success: true, results };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Search failed" 
      };
    }
  },
});

// Generate a diff for a file change
export const generateDiffTool = createTool({
  id: "generate-diff",
  description: "Generate a diff for replacing content in a file.",
  inputSchema: z.object({
    filePath: z.string().describe("Path to the file to modify"),
    oldContent: z.string().describe("The exact content to find and replace"),
    newContent: z.string().describe("The new content to insert"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    diff: z.object({
      filePath: z.string(),
      oldContent: z.string(),
      newContent: z.string(),
      unified: z.string(),
    }).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { filePath, oldContent, newContent } = context as unknown as { 
      filePath: string; 
      oldContent: string; 
      newContent: string; 
    };

    try {
      // Generate a simple unified diff representation
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');
      
      let unified = `--- a/${filePath}\n+++ b/${filePath}\n`;
      unified += `@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;
      
      for (const line of oldLines) {
        unified += `-${line}\n`;
      }
      for (const line of newLines) {
        unified += `+${line}\n`;
      }

      return {
        success: true,
        diff: {
          filePath,
          oldContent,
          newContent,
          unified,
        },
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Diff generation failed" 
      };
    }
  },
});

// Create a pull request
export const createPullRequestTool = createTool({
  id: "create-pull-request",
  description: "Create a pull request with the specified changes.",
  inputSchema: z.object({
    title: z.string().describe("Title of the pull request"),
    description: z.string().describe("Description/body of the pull request"),
    branchName: z.string().describe("Name for the new branch"),
    changes: z.array(z.object({
      filePath: z.string(),
      content: z.string(),
    })).describe("Files to create or modify"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    pullRequest: z.object({
      number: z.number(),
      url: z.string(),
    }).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { title, description, branchName } = context as unknown as { 
      title: string; 
      description: string; 
      branchName: string;
      changes: Array<{ filePath: string; content: string }>;
    };
    const runtimeContext = (context as any).runtimeContext;
    const github = runtimeContext?.get("github") as GitHubContext | undefined;
    
    if (!github) {
      return { success: false, error: "GitHub not initialized" };
    }

    try {
      // In a real implementation, we would:
      // 1. Create a new branch from the base branch
      // 2. Commit all the changes to the new branch
      // 3. Create a pull request

      const response = await github.octokit.pulls.create({
        owner: github.owner,
        repo: github.repo,
        title,
        body: description,
        head: branchName,
        base: github.branch,
      });

      return {
        success: true,
        pullRequest: {
          number: response.data.number,
          url: response.data.html_url,
        },
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "PR creation failed" 
      };
    }
  },
});
