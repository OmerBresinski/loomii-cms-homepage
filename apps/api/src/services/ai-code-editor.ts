import { generateObject, gateway } from "ai";
import { z } from "zod";

// Simplified schema - AI only needs to identify what to find/replace
const codeEditResponseSchema = z.object({
  searchString: z.string().describe("The exact string to search for in the file (copy exactly from the source)"),
  replaceString: z.string().describe("The replacement string with the edit applied"),
  lineNumber: z.number().describe("The line number where the change should be made"),
  confidence: z.enum(["high", "medium", "low"]).describe("How confident you are this is the correct location"),
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

const SYSTEM_PROMPT = `You are a precise code editor. Your job is to identify the exact text to find and replace in source code.

CRITICAL RULES:
1. searchString must be copied EXACTLY from the source code (including whitespace, quotes, etc.)
2. searchString should include enough context to be unique (e.g., include the surrounding tag or attribute)
3. replaceString should have the same structure as searchString, just with the values changed
4. Apply ALL requested changes in replaceString - this may include text content AND href attribute changes
5. For link elements with both text and href changes, include BOTH in searchString/replaceString
6. If you cannot find a unique match, use confidence: "low"

Example for changing link text AND href:
- searchString: '<a href="https://old.com">Old Text</a>'
- replaceString: '<a href="https://new.com">New Text</a>'`;

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
    const textChanged = edit.oldValue !== edit.newValue;
    const hrefChanged = edit.oldHref !== undefined && edit.newHref !== undefined && edit.oldHref !== edit.newHref;

    console.log("[AI Editor] Processing edit:", {
      elementName: edit.elementName,
      elementType: edit.elementType,
      textChanged,
      hrefChanged,
      oldValue: edit.oldValue?.slice(0, 50),
      newValue: edit.newValue?.slice(0, 50),
      oldHref: edit.oldHref,
      newHref: edit.newHref,
    });

    const result = await generateObject({
      model: gateway("anthropic/claude-3-haiku"),
      schema: codeEditResponseSchema,
      system: SYSTEM_PROMPT,
      prompt: buildEditPrompt(fileContent, filePath, edit),
      temperature: 0,
    });

    const response = result.object;
    console.log("[AI Editor] AI response:", {
      searchString: response.searchString?.slice(0, 100),
      replaceString: response.replaceString?.slice(0, 100),
      lineNumber: response.lineNumber,
      confidence: response.confidence,
    });

    // Check if the search string exists in the file
    if (!fileContent.includes(response.searchString)) {
      return {
        success: false,
        newContent: fileContent,
        error: `Search string not found in file: "${response.searchString.slice(0, 50)}..."`,
      };
    }

    // Check for multiple occurrences (ambiguity)
    const occurrences = fileContent.split(response.searchString).length - 1;
    if (occurrences > 1 && response.confidence === "low") {
      return {
        success: false,
        newContent: fileContent,
        error: `Multiple occurrences (${occurrences}) of search string and low confidence`,
      };
    }

    // Apply the replacement
    const newContent = fileContent.replace(response.searchString, response.replaceString);

    // Verify the changes were applied
    if (textChanged && !newContent.includes(edit.newValue)) {
      return {
        success: false,
        newContent: fileContent,
        error: "Replacement did not include new text value",
      };
    }

    if (hrefChanged && !newContent.includes(edit.newHref!)) {
      return {
        success: false,
        newContent: fileContent,
        error: "Replacement did not include new href value",
      };
    }

    return {
      success: true,
      newContent,
      changedLine: response.lineNumber,
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
  // Expand context to find the full element (links may span multiple lines)
  const contextStart = Math.max(0, targetLine - 5);
  const contextEnd = Math.min(lines.length, targetLine + 5);

  // Build context with line numbers
  const contextWithLineNumbers = lines
    .slice(contextStart, contextEnd)
    .map((line, idx) => `${contextStart + idx + 1}| ${line}`)
    .join("\n");

  const textChanged = edit.oldValue !== edit.newValue;
  const hrefChanged = edit.oldHref !== undefined && edit.newHref !== undefined && edit.oldHref !== edit.newHref;

  let editDescription = "";
  if (textChanged && hrefChanged) {
    editDescription = `Make BOTH changes in searchString/replaceString:
1. Text: "${edit.oldValue}" → "${edit.newValue}"
2. href: "${edit.oldHref}" → "${edit.newHref}"

Include the ENTIRE <a> tag in searchString so both changes can be made.`;
  } else if (textChanged) {
    editDescription = `Change text: "${edit.oldValue}" → "${edit.newValue}"`;
  } else if (hrefChanged) {
    editDescription = `Change href: "${edit.oldHref}" → "${edit.newHref}"`;
  }

  return `Find the exact string to search and replace for this edit:

FILE: ${filePath}
ELEMENT: ${edit.elementName} (${edit.elementType})
TARGET LINE: ~${targetLine}

CHANGES NEEDED:
${editDescription}

SOURCE CODE CONTEXT (lines ${contextStart + 1}-${contextEnd}):
${contextWithLineNumbers}

Return searchString (exact text from source) and replaceString (with changes applied).
For multi-line elements, include line breaks in both strings.`;
}
