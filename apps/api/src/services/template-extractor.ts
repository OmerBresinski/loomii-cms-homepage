import { getFileContent, decodeFileContent } from "./github";
import { generateObject } from "ai";
import { z } from "zod";

// Schema for AI-generated template extraction
const templateExtractionSchema = z.object({
  templateCode: z
    .string()
    .describe(
      "The code template for a single item, with placeholders like {{PLACEHOLDER_NAME}}"
    ),
  placeholders: z
    .array(
      z.object({
        name: z
          .string()
          .describe(
            "The placeholder name (e.g., 'TITLE', 'DESCRIPTION', 'HREF')"
          ),
        description: z.string().describe("What this placeholder represents"),
        type: z
          .enum(["text", "href", "src", "alt"])
          .describe("The type of content expected"),
        example: z.string().describe("An example value from an existing item"),
      })
    )
    .describe("List of placeholders in the template"),
  containerInfo: z
    .object({
      tag: z
        .string()
        .optional()
        .describe("The parent container tag (e.g., 'ul', 'div', 'nav')"),
      className: z
        .string()
        .optional()
        .describe("CSS class of the container if identifiable"),
      indentation: z
        .string()
        .describe("The whitespace/indentation used for each item"),
    })
    .describe("Information about the container element"),
});

export interface ExtractedTemplate {
  templateCode: string;
  placeholders: Array<{
    name: string;
    description: string;
    type: "text" | "href" | "src" | "alt";
    example: string;
  }>;
  containerInfo: {
    tag?: string;
    className?: string;
    indentation: string;
  };
}

export interface TemplateExtractionOptions {
  accessToken: string;
  owner: string;
  repo: string;
  branch: string;
  sourceFile: string;
  startLine: number;
  endLine: number;
  itemCount: number;
}

/**
 * Extract a template from a group of similar elements in source code.
 * Uses AI to identify the repeating pattern and extract placeholders.
 */
export async function extractGroupTemplate(
  options: TemplateExtractionOptions
): Promise<ExtractedTemplate | null> {
  const {
    accessToken,
    owner,
    repo,
    branch,
    sourceFile,
    startLine,
    endLine,
    itemCount,
  } = options;

  try {
    // Fetch the file content
    const fileData = await getFileContent(
      accessToken,
      owner,
      repo,
      sourceFile,
      branch
    );
    const content = decodeFileContent(fileData.content);
    const lines = content.split("\n");

    // Extract the relevant lines (with some context)
    const contextStart = Math.max(0, startLine - 3);
    const contextEnd = Math.min(lines.length, endLine + 3);
    const codeBlock = lines.slice(contextStart, contextEnd).join("\n");

    // The actual group code (without context)
    const groupCode = lines.slice(startLine - 1, endLine).join("\n");

    console.log(
      `[Template Extractor] Analyzing ${itemCount} items from ${sourceFile}:${startLine}-${endLine}`
    );

    const result = await generateObject({
      model: "anthropic/claude-3.5-sonnet" as any,
      schema: templateExtractionSchema,
      system: `You extract simple templates from repeating code patterns.

CRITICAL: Use ONLY these placeholders:
- {{TEXT}} - The main text content (ALWAYS include this)
- {{HREF}} - Link URL (ONLY if element has an href attribute)

DO NOT use: {{TITLE}}, {{DESCRIPTION}}, {{ALT}}, {{SRC}}, or any other placeholders.
Keep it simple: 1 placeholder for text, optionally 1 for href.

EXAMPLE - Link element:
Input: <a href="/about" class="nav-link">About Us</a>
Output template: <a href="{{HREF}}" class="nav-link">{{TEXT}}</a>
Placeholders: TEXT (text content), HREF (link URL)

EXAMPLE - Text element:
Input: <span class="feature">Fast Performance</span>
Output template: <span class="feature">{{TEXT}}</span>
Placeholders: TEXT only

RULES:
1. Preserve ALL formatting, classes, and structure exactly
2. Only replace the VARIABLE content with {{TEXT}} or {{HREF}}
3. Never create more than 2 placeholders`,
      prompt: `Extract a template from this code that contains ${itemCount} similar items.

FILE: ${sourceFile}
LINES: ${startLine} to ${endLine}

CODE BLOCK (with context):
${codeBlock}

GROUP CODE (the actual items):
${groupCode}

Identify the repeating pattern and create a template with placeholders for the variable parts.`,
      temperature: 0,
    });

    console.log(
      `[Template Extractor] Successfully extracted template with ${result.object.placeholders.length} placeholders`
    );

    return result.object as ExtractedTemplate;
  } catch (error) {
    console.error("[Template Extractor] Failed to extract template:", error);
    return null;
  }
}

/**
 * Fill a template with provided values to generate new code.
 */
export function fillTemplate(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    // Replace {{KEY}} with value
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

/**
 * Calculate where to insert a new item in the source file.
 * Returns the line number after which to insert.
 */
export function calculateInsertPosition(
  groupEndLine: number,
  itemIndex: number,
  totalItems: number
): number {
  // By default, insert at the end of the group
  if (itemIndex >= totalItems) {
    return groupEndLine;
  }

  // For inserting at a specific position, we'd need more context
  // This is simplified - for now, always insert at end
  return groupEndLine;
}

/**
 * Generate code for adding a new item to a group.
 * Returns the new code and the line number where it should be inserted.
 */
export function generateAddItemCode(
  template: ExtractedTemplate,
  values: Record<string, string>,
  insertAfterLine: number
): { code: string; insertLine: number } {
  const filledCode = fillTemplate(template.templateCode, values);

  // Add proper indentation
  const indentedCode = template.containerInfo.indentation + filledCode;

  return {
    code: indentedCode,
    insertLine: insertAfterLine,
  };
}

/**
 * Generate code change for removing an item from a group.
 * Returns the line range to delete.
 */
export function generateDeleteItemRange(
  sourceLine: number,
  templateLineCount: number
): { startLine: number; endLine: number } {
  return {
    startLine: sourceLine,
    endLine: sourceLine + templateLineCount - 1,
  };
}
