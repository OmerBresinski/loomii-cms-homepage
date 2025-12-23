import { generateObject, gateway } from "ai";
import { z } from "zod";

// Schema for the AI's structured response
const codeEditResponseSchema = z.object({
  modifiedCode: z.string().describe("The complete modified file content with the edit applied"),
  changeApplied: z.boolean().describe("Whether the change was successfully applied"),
  changedLineNumber: z.number().describe("The line number where the change was made"),
  originalSnippet: z.string().describe("The original code snippet that was changed (just the relevant line or element)"),
  newSnippet: z.string().describe("The new code snippet after the change (just the relevant line or element)"),
  reasoning: z.string().describe("Brief explanation of how the edit was applied"),
});

interface EditInstruction {
  elementName: string;
  elementType: string;
  oldValue: string;
  newValue: string;
  oldHref?: string;
  newHref?: string;
  sourceLine?: number;
}

interface AIEditResult {
  success: boolean;
  newContent: string;
  changedLine?: number;
  error?: string;
}

const SYSTEM_PROMPT = `You are a precise code editor. Your ONLY job is to apply a single content edit to source code.

CRITICAL RULES:
1. You MUST only change the specific text content requested - nothing else
2. You MUST preserve ALL formatting, indentation, whitespace, and line breaks exactly as they are
3. You MUST NOT add, remove, or modify any code that isn't part of the requested change
4. You MUST NOT add comments, fix bugs, improve code quality, or make any other modifications
5. You MUST return the COMPLETE file content, not just the changed portion
6. If the old value appears multiple times, use the provided line number and element context to identify the correct one
7. If you cannot find the exact text to change, set changeApplied to false

You are a surgical tool - make the minimum possible change to achieve the edit.`;

/**
 * Use AI to apply a content edit to source code.
 * Uses structured output with Zod schema for reliable responses.
 */
export async function applyEditWithAI(
  fileContent: string,
  filePath: string,
  edit: EditInstruction
): Promise<AIEditResult> {
  try {
    const result = await generateObject({
      model: gateway("anthropic/claude-3-haiku"),
      schema: codeEditResponseSchema,
      system: SYSTEM_PROMPT,
      prompt: buildEditPrompt(fileContent, filePath, edit),
      temperature: 0,
    });

    const response = result.object;

    // Verify the change was applied
    if (!response.changeApplied) {
      return {
        success: false,
        newContent: fileContent,
        error: `AI could not apply edit: ${response.reasoning}`,
      };
    }

    // Verify the new content contains the new value
    if (!response.modifiedCode.includes(edit.newValue)) {
      return {
        success: false,
        newContent: fileContent,
        error: "Modified code does not contain the new value",
      };
    }

    // Verify the old value was removed (unless old and new overlap)
    if (
      !edit.newValue.includes(edit.oldValue) &&
      response.modifiedCode.includes(edit.oldValue) &&
      fileContent.split(edit.oldValue).length === 2 // only had one occurrence
    ) {
      return {
        success: false,
        newContent: fileContent,
        error: "Modified code still contains the old value",
      };
    }

    // Verify line count is preserved (edits shouldn't add/remove lines)
    const originalLines = fileContent.split("\n").length;
    const newLines = response.modifiedCode.split("\n").length;
    if (Math.abs(originalLines - newLines) > 1) {
      return {
        success: false,
        newContent: fileContent,
        error: `Line count changed significantly (${originalLines} → ${newLines})`,
      };
    }

    return {
      success: true,
      newContent: response.modifiedCode,
      changedLine: response.changedLineNumber,
    };
  } catch (error) {
    console.error("AI edit failed:", error);
    return {
      success: false,
      newContent: fileContent,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function buildEditPrompt(
  fileContent: string,
  filePath: string,
  edit: EditInstruction
): string {
  const lines = fileContent.split("\n");
  const targetLine = edit.sourceLine || 1;
  const contextStart = Math.max(0, targetLine - 8);
  const contextEnd = Math.min(lines.length, targetLine + 8);

  // Build context with line numbers
  const contextWithLineNumbers = lines
    .slice(contextStart, contextEnd)
    .map((line, idx) => `${contextStart + idx + 1}| ${line}`)
    .join("\n");

  let editDescription = `Change text: "${edit.oldValue}" → "${edit.newValue}"`;
  if (edit.oldHref && edit.newHref && edit.oldHref !== edit.newHref) {
    editDescription += `\nAlso change href: "${edit.oldHref}" → "${edit.newHref}"`;
  }

  return `Apply this edit to the file:

FILE: ${filePath}
ELEMENT: ${edit.elementName} (${edit.elementType})
TARGET LINE: ~${targetLine}

EDIT:
${editDescription}

CONTEXT (lines ${contextStart + 1}-${contextEnd}):
${contextWithLineNumbers}

FULL FILE:
${fileContent}`;
}
