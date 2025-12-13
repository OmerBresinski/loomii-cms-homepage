import { Agent } from "@mastra/core/agent";
import { z } from "zod";

import { 
  readFileTool, 
  searchCodeTool, 
  generateDiffTool 
} from "../tools/github";

// Code Generator Agent - Generates code diffs for content changes
export const codeGeneratorAgent = new Agent({
  id: "code-generator",
  name: "Code Generator",
  description: `
    This agent generates code modifications for content changes.
    It reads source files, understands the codebase structure,
    and creates precise diffs that update content while maintaining
    code quality and formatting.
  `,
  instructions: `
    You are an expert code generator that creates precise code modifications.
    
    Your task is to:
    1. Given an element edit (old value -> new value), find the source file
    2. Read the relevant source file
    3. Locate the exact content that needs to be changed
    4. Generate a minimal, focused diff that updates the content
    
    Guidelines:
    - Preserve the existing code style and formatting
    - Only change what's necessary - don't refactor or modify other code
    - Handle different content patterns:
      - JSX text content
      - String literals in variables
      - Template literals
      - Object properties
    - Be precise with whitespace and indentation
    - Consider that content might be in:
      - Component files (.tsx, .jsx)
      - Content files (.ts, .js, .json)
      - MDX/Markdown files
      - Config files
    
    For each change, return:
    - The file path
    - The exact old content (context + target)
    - The exact new content
    - Line numbers if available
    
    If you cannot find the content or are unsure, explain why and suggest
    how the user might manually locate it.
  `,
  model: {
    provider: "ANTHROPIC",
    name: "claude-sonnet-4-20250514",
  } as any, // Model config will be set at runtime
  tools: {
    readFileTool,
    searchCodeTool,
    generateDiffTool,
  },
});

// Schema for code changes
export const codeChangeSchema = z.object({
  filePath: z.string(),
  oldContent: z.string(),
  newContent: z.string(),
  startLine: z.number().optional(),
  endLine: z.number().optional(),
  description: z.string(),
});

export const prPayloadSchema = z.object({
  title: z.string(),
  description: z.string(),
  branch: z.string(),
  changes: z.array(codeChangeSchema),
});

export type CodeChange = z.infer<typeof codeChangeSchema>;
export type PRPayload = z.infer<typeof prPayloadSchema>;

